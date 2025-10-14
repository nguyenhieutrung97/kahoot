"use client";

import * as signalR from '@microsoft/signalr';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.trungtero.com';

let singletonConnection: signalR.HubConnection | null = null;
let starting = false;
let startingPromise: Promise<void> | null = null; // track ongoing start
let connectionHealthCheck: NodeJS.Timeout | null = null;
let lastSuccessfulPing = Date.now();

export function getGameHub(): signalR.HubConnection {
  if (!singletonConnection) {
    const hubUrl = `${API_BASE_URL}/gameHub` + (typeof window!=='undefined' && window.location.search.includes('hubDebug') ? '?debug=1':'' );
    console.log('[GameHub] Creating new connection', hubUrl);
    singletonConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        withCredentials: true,
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          // Progressive exponential backoff with jitter
          const baseDelay = Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 30000);
          const jitter = Math.random() * 750; // up to 750ms jitter to spread thundering herd
          const delay = baseDelay + jitter;
          // Allow up to 5 minutes of reconnection attempts
          if (retryContext.elapsedMilliseconds > 300000) {
            console.warn('[GameHub] Max reconnection window (5m) reached, giving up');
            return null;
          }
          console.log(`[GameHub] Retry ${retryContext.previousRetryCount + 1} in ${Math.round(delay)}ms`);
          return delay;
        }
      })
      .configureLogging(signalR.LogLevel.Information)
      .build();

    singletonConnection.onclose(err => {
      if (err) {
        console.error('[GameHub] Closed with error', err);
        // Trigger custom reconnection logic for critical errors
        if (err.name === 'AbortError' || err.name === 'NetworkError') {
          console.log('[GameHub] Network error detected, will attempt reconnection');
        }
      } else {
        console.warn('[GameHub] Closed gracefully');
      }
    });
    
    singletonConnection.onreconnecting(err => {
      console.warn('[GameHub] Reconnecting...', err?.message || 'Connection lost');
      // Emit custom event for UI updates
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('signalr-reconnecting', { 
          detail: { error: err?.message, timestamp: Date.now() } 
        }));
      }
    });
    
    singletonConnection.onreconnected(connectionId => {
      console.log('[GameHub] Reconnected successfully', connectionId);
      // Emit custom event for UI updates
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('signalr-reconnected', { 
          detail: { connectionId, timestamp: Date.now() } 
        }));
      }
      // Reset last successful ping instantly so health checks resume
      lastSuccessfulPing = Date.now();
    });
  }
  return singletonConnection;
}

export async function ensureStarted(conn: signalR.HubConnection): Promise<void> {
  const connectedState = signalR.HubConnectionState.Connected as any;
  if ((conn.state as any) === connectedState) return;
  
  // If a start attempt already in progress, wait for it
  if (startingPromise) {
    try { 
      await startingPromise; 
    } catch (err) { 
      console.warn('[GameHub] Previous start attempt failed, will retry', err);
    }
    if ((conn.state as any) === connectedState) return;
  }
  
  if (starting) {
    // legacy flag path (should be covered by startingPromise) – small delay retry
    let attempts = 0;
    while ((conn.state as any) !== connectedState && attempts < 20 && starting) {
      await new Promise(r => setTimeout(r, 100));
      attempts++;
    }
    if ((conn.state as any) === connectedState) return;
  }
  
  starting = true;
  startingPromise = (async () => {
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        console.log(`[GameHub] Starting connection... (attempt ${retryCount + 1}/${maxRetries})`);
        
        // Stop existing connection if in wrong state
        if ((conn.state as any) === signalR.HubConnectionState.Connecting) {
          try { await conn.stop(); } catch {}
          await new Promise(r => setTimeout(r, 500)); // Brief delay
        }
        
        const startPromise = conn.start();
        const timeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Hub start timeout after 15s (attempt ${retryCount + 1})`)), 15000)
        );
        
        await Promise.race([startPromise, timeout]);
        console.log('[GameHub] Connected successfully');
        break; // Success, exit retry loop
        
      } catch (err) {
        retryCount++;
        console.error(`[GameHub] Start attempt ${retryCount} failed:`, err);
        
        if (retryCount >= maxRetries) {
          console.error('[GameHub] Max start attempts reached, giving up');
          throw new Error(`Failed to connect after ${maxRetries} attempts: ${(err as Error)?.message}`);
        }
        
        // Exponential backoff for retries
        const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
        console.log(`[GameHub] Retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  })();
  
  try {
    await startingPromise;
    // Begin health ping once connected (if not already)
    startConnectionHealthCheck();
  } finally {
    starting = false;
    // allow tiny defer so awaiting callers finish before nulling
    const done = startingPromise; 
    startingPromise = null; 
    await Promise.resolve(done); // ensure microtask flush
  }
}

// Manual reconnection function
export async function forceReconnect(): Promise<void> {
  console.log('[GameHub] Manual reconnection requested');
  
  if (singletonConnection) {
    try {
      await singletonConnection.stop();
    } catch (err) {
      console.warn('[GameHub] Error stopping connection during manual reconnect:', err);
    }
    
    // Reset connection state
    singletonConnection = null;
    starting = false;
    startingPromise = null;
    
    // Clear health check
    if (connectionHealthCheck) {
      clearInterval(connectionHealthCheck);
      connectionHealthCheck = null;
    }
    
    // Wait a moment before creating new connection
    await new Promise(r => setTimeout(r, 1000));
  }
  
  // Create new connection and start it
  const newConnection = getGameHub();
  await ensureStarted(newConnection);
}

// Health check ping: periodically invoke Ping hub method to keep connection alive and detect silent drops
// Primary health check API (single implementation)
export function startConnectionHealthCheck(intervalMs: number = 20000) {
  if (connectionHealthCheck || !singletonConnection) return;
  connectionHealthCheck = setInterval(async () => {
    if (!singletonConnection) return;
    const state = singletonConnection.state;
    if (state === signalR.HubConnectionState.Connected) {
      try {
        await singletonConnection.invoke('Ping');
        lastSuccessfulPing = Date.now();
      } catch (err) {
        console.warn('[GameHub] Ping failed', err);
      }
    }
    // Stale connection safeguard
    if (Date.now() - lastSuccessfulPing > 120000 && state === signalR.HubConnectionState.Connected) {
      console.warn('[GameHub] Connection stale (>120s since last successful ping). Forcing reconnect');
      try { await forceReconnect(); } catch (reErr) { console.error('[GameHub] Forced reconnect failed', reErr); }
    }
  }, intervalMs);
}

export function stopConnectionHealthCheck() {
  if (connectionHealthCheck) { clearInterval(connectionHealthCheck); connectionHealthCheck = null; }
}

export function getConnectionStatus(): { connected: boolean; state: string; lastPing: number; timeSinceLastPing: number } {
  const state = singletonConnection?.state || 'Disconnected';
  const connected = state === signalR.HubConnectionState.Connected;
  const timeSinceLastPing = Date.now() - lastSuccessfulPing;
  return { connected, state: state.toString(), lastPing: lastSuccessfulPing, timeSinceLastPing };
}

// Connection health monitoring
// (Removed duplicate legacy health-check block)


