"use client";
import { HubConnection } from '@microsoft/signalr';
import { getGameHub, ensureStarted, forceReconnect } from './gameHub';
import type { HubEventPayloads } from '@/types/hub-events';

type EventKey = keyof HubEventPayloads | string;
type Listener<T = any> = (payload: T) => void;

interface SubscriptionRecord { event: EventKey; listener: Listener; }

export class HubClient {
  private conn: HubConnection | null = null;
  private static _instance: HubClient | null = null;
  private listeners: SubscriptionRecord[] = [];
  private starting = false;
  private started = false;
  private startPromise: Promise<void> | null = null;
  private invocationQueue: { method: string; args: any[]; resolve: (v:any)=>void; reject:(e:any)=>void }[] = [];
  // Persist last session context for automatic restoration after reconnect
  private lastRoomCode: string | null = null;
  private lastUserName: string | null = null;
  private lastPlayerId: string | null = null;
  private lastRole: 'host' | 'player' | null = null;
  private autoRestoreEnabled = true;

  private constructor() { /* defer actual hub creation until browser usage to avoid SSR ws import */ }

  static instance(): HubClient {
    if (!this._instance) this._instance = new HubClient();
    return this._instance;
  }

  connection(): HubConnection {
    if (!this.conn) {
      if (typeof window === 'undefined') {
        // Create a minimal no-op proxy to avoid SSR crashes
        const noop: any = {
          state: 'Disconnected',
          on: () => {}, off: () => {}, invoke: async () => { throw new Error('SignalR not available server-side'); }, stop: async () => {},
        };
        this.conn = noop as HubConnection;
      } else {
        this.conn = getGameHub();
        this.setupConnectionHandlers();
      }
    }
    return this.conn;
  }

  private setupConnectionHandlers() {
    const c = this.conn;
    if (!c) return;
    // Avoid attaching multiple times
    const marker: any = c as any;
    if (marker.__hubClientHandlersAttached) return;
    marker.__hubClientHandlersAttached = true;
    try {
      c.onreconnected?.(() => { this.handleReconnected(); });
      // Optional: onclose resets started flag so start() can re-init
      c.onclose?.(() => { this.started = false; });
    } catch {}
  }

  setAutoRestoreEnabled(enabled: boolean) { this.autoRestoreEnabled = enabled; }

  private async handleReconnected() {
    if (!this.autoRestoreEnabled) return;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hub-restoring-start'));
    }
    try {
      await this.restoreSession();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('hub-restored', { detail: { ok: true } }));
      }
    } catch (err) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('hub-restored', { detail: { ok: false, error: (err as Error)?.message || 'restore failed' } }));
      }
    }
  }

  private async restoreSession() {
    // Nothing to restore
    if (!this.lastRoomCode || !this.lastRole) return;
    // Ensure connection started
    await this.start().catch(() => {});
    try {
      if (this.lastRole === 'host') {
        // Reattach host to room
        await this.invoke('AttachHost', this.lastRoomCode);
        // Try requesting status to trigger fresh state events
        try { await this.invoke('GetRoomStatus', this.lastRoomCode); } catch {}
      } else if (this.lastRole === 'player') {
        // Rejoin game with previous playerId to trigger reconnection handling server-side
        await this.invoke('JoinGame', this.lastRoomCode, this.lastUserName ?? '', this.lastPlayerId ?? null);
      }
    } catch (err) {
      throw err; // Let caller dispatch error event
    }
  }

  async start(): Promise<void> {
    if (this.started) return;
    if (this.starting && this.startPromise) { await this.startPromise; return; }
    this.starting = true;
    const c = this.connection();
    this.startPromise = ensureStarted(c)
      .then(() => { this.started = true; })
      .finally(() => { this.starting = false; });
    await this.startPromise;

    // Flush queued invocations accumulated while starting
    const queue = [...this.invocationQueue];
    this.invocationQueue = [];
    for (const q of queue) {
      try { const res = await this.connection().invoke(q.method, ...q.args); q.resolve(res); }
      catch (err) { q.reject(err); }
    }
  }

  async reconnect(): Promise<void> {
    await forceReconnect();
    if (typeof window !== 'undefined') this.conn = getGameHub(); else this.conn = null;
    this.started = false;
    this.startPromise = null;
    await this.start();
    // Explicit restore after manual reconnect (onreconnected already handles automatic cases)
    if (this.autoRestoreEnabled) {
      await this.handleReconnected();
    }
  }

  private async invoke(method: string, ...args: any[]) {
    // If already connected, invoke immediately
    const c = this.connection();
    if (this.started && c.state === 'Connected') {
      return c.invoke(method, ...args);
    }
    // If a start in progress, queue invocation until start finishes
    if (this.starting || this.startPromise) {
      return new Promise((resolve, reject) => {
        this.invocationQueue.push({ method, args, resolve, reject });
      });
    }
    // Not started and not starting: begin start then invoke
    await this.start();
    return this.connection().invoke(method, ...args);
  }

  on<K extends keyof HubEventPayloads>(event: K, listener: (p: HubEventPayloads[K]) => void): () => void {
  const c = this.connection();
  c.on(event as string, listener as any);
    const rec: SubscriptionRecord = { event, listener: listener as any };
    this.listeners.push(rec);
    return () => this.off(event, listener as any);
  }

  off(event: EventKey, listener?: Listener) {
  const c = this.connection();
  if (listener) c.off(event as string, listener as any); else c.off(event as string);
    this.listeners = this.listeners.filter(l => !(l.event === event && (!listener || l.listener === listener)));
  }

  removeAll() { const c = this.connection(); this.listeners.forEach(l => c.off(l.event as string, l.listener as any)); this.listeners = []; }

  // Invocation helpers mirroring existing hook surface.
  async createGameRoom(gameId: string, autoShowResults = true) { return this.invoke('CreateGameRoom', gameId, autoShowResults); }
  async joinGame(roomCode: string, userName: string, playerId?: string | null) {
    // Persist context for auto restore
    this.lastRoomCode = roomCode;
    this.lastUserName = userName;
    this.lastPlayerId = playerId ?? null;
    this.lastRole = 'player';
    return this.invoke('JoinGame', roomCode, userName, playerId ?? null);
  }
  async startGame(roomCode: string) { return this.invoke('StartGame', roomCode); }
  async submitAnswer(answerId: string) { return this.invoke('SubmitAnswer', answerId); }
  async submitMultipleAnswers(answerIds: string[]) { return this.invoke('SubmitMultipleAnswers', answerIds); }
  async proceedToNextQuestion(roomCode: string) { return this.invoke('ProceedToNextQuestion', roomCode); }
  async showFinalLeaderboard(roomCode: string) { return this.invoke('ShowFinalLeaderboard', roomCode); }
  async updateAutoShowResults(roomCode: string, autoShowResults: boolean) { return this.invoke('UpdateAutoShowResults', roomCode, autoShowResults); }
  async activateGameSession(roomCode: string) { return this.invoke('ActivateGameSession', roomCode); }
  async attachHost(roomCode: string) {
    this.lastRoomCode = roomCode;
    this.lastRole = 'host';
    return this.invoke('AttachHost', roomCode);
  }
  async endRoomSession(roomCode: string) { return this.invoke('EndRoomSession', roomCode); }
}

export function getHubClient() { return HubClient.instance(); }