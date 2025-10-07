"use client";

import * as signalR from '@microsoft/signalr';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.trungtero.com';

let singletonConnection: signalR.HubConnection | null = null;
let starting = false;
let startingPromise: Promise<void> | null = null; // track ongoing start

export function getGameHub(): signalR.HubConnection {
  if (!singletonConnection) {
    const hubUrl = `${API_BASE_URL}/gameHub` + (typeof window!=='undefined' && window.location.search.includes('hubDebug') ? '?debug=1':'' );
    console.log('[GameHub] Creating new connection', hubUrl);
    singletonConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        withCredentials: true,
      })
      .withAutomaticReconnect({ nextRetryDelayInMilliseconds: ctx => {
        if (ctx.elapsedMilliseconds > 30000) return null; // stop after 30s
        return Math.min(5000, 1000 * (ctx.previousRetryCount + 1));
      }})
      .configureLogging(signalR.LogLevel.Information)
      .build();

    singletonConnection.onclose(err => {
      if (err) console.error('[GameHub] Closed with error', err);
      else console.warn('[GameHub] Closed');
    });
    singletonConnection.onreconnecting(err => console.warn('[GameHub] Reconnecting...', err?.message));
    singletonConnection.onreconnected(id => console.log('[GameHub] Reconnected', id));
  }
  return singletonConnection;
}

export async function ensureStarted(conn: signalR.HubConnection): Promise<void> {
  const connectedState = signalR.HubConnectionState.Connected as any;
  if ((conn.state as any) === connectedState) return;
  // If a start attempt already in progress, wait for it
  if (startingPromise) {
    try { await startingPromise; } catch { /* swallow, next logic may retry */ }
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
    try {
      console.log('[GameHub] Starting connection...');
      const startPromise = conn.start();
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Hub start timeout after 10s')), 10000));
      await Promise.race([startPromise, timeout]);
      console.log('[GameHub] Connected');
    } finally {
      starting = false;
      // allow tiny defer so awaiting callers finish before nulling
      const done = startingPromise; startingPromise = null; await Promise.resolve(done); // ensure microtask flush
    }
  })();
  return startingPromise;
}


