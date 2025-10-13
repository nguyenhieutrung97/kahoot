"use client";
import { HubConnection } from '@microsoft/signalr';
import { getGameHub, ensureStarted, forceReconnect } from './gameHub';
import type { HubEventPayloads } from '@/types/hub-events';

type EventKey = keyof HubEventPayloads | string;
type Listener<T = any> = (payload: T) => void;

interface SubscriptionRecord { event: EventKey; listener: Listener; }

export class HubClient {
  private conn: HubConnection;
  private static _instance: HubClient | null = null;
  private listeners: SubscriptionRecord[] = [];
  private starting = false;
  private started = false;
  private startPromise: Promise<void> | null = null;
  private invocationQueue: { method: string; args: any[]; resolve: (v:any)=>void; reject:(e:any)=>void }[] = [];

  private constructor() { this.conn = getGameHub(); }

  static instance(): HubClient {
    if (!this._instance) this._instance = new HubClient();
    return this._instance;
  }

  connection(): HubConnection { return this.conn; }

  async start(): Promise<void> {
    if (this.started) return;
    if (this.starting && this.startPromise) { await this.startPromise; return; }
    this.starting = true;
    this.startPromise = ensureStarted(this.conn)
      .then(() => { this.started = true; })
      .finally(() => { this.starting = false; });
    await this.startPromise;

    // Flush queued invocations accumulated while starting
    const queue = [...this.invocationQueue];
    this.invocationQueue = [];
    for (const q of queue) {
      try { const res = await this.conn.invoke(q.method, ...q.args); q.resolve(res); }
      catch (err) { q.reject(err); }
    }
  }

  async reconnect(): Promise<void> {
    await forceReconnect();
    this.conn = getGameHub();
    this.started = false;
    this.startPromise = null;
    await this.start();
  }

  private async invoke(method: string, ...args: any[]) {
    // If already connected, invoke immediately
    if (this.started && this.conn.state === 'Connected') {
      return this.conn.invoke(method, ...args);
    }
    // If a start in progress, queue invocation until start finishes
    if (this.starting || this.startPromise) {
      return new Promise((resolve, reject) => {
        this.invocationQueue.push({ method, args, resolve, reject });
      });
    }
    // Not started and not starting: begin start then invoke
    await this.start();
    return this.conn.invoke(method, ...args);
  }

  on<K extends keyof HubEventPayloads>(event: K, listener: (p: HubEventPayloads[K]) => void): () => void {
    this.conn.on(event as string, listener as any);
    const rec: SubscriptionRecord = { event, listener: listener as any };
    this.listeners.push(rec);
    return () => this.off(event, listener as any);
  }

  off(event: EventKey, listener?: Listener) {
    if (listener) this.conn.off(event as string, listener as any); else this.conn.off(event as string);
    this.listeners = this.listeners.filter(l => !(l.event === event && (!listener || l.listener === listener)));
  }

  removeAll() { this.listeners.forEach(l => this.conn.off(l.event as string, l.listener as any)); this.listeners = []; }

  // Invocation helpers mirroring existing hook surface.
  async createGameRoom(gameId: string, autoShowResults = true) { return this.invoke('CreateGameRoom', gameId, autoShowResults); }
  async joinGame(roomCode: string, userName: string, playerId?: string | null) { return this.invoke('JoinGame', roomCode, userName, playerId ?? null); }
  async startGame(roomCode: string) { return this.invoke('StartGame', roomCode); }
  async submitAnswer(answerId: string) { return this.invoke('SubmitAnswer', answerId); }
  async submitMultipleAnswers(answerIds: string[]) { return this.invoke('SubmitMultipleAnswers', answerIds); }
  async proceedToNextQuestion(roomCode: string) { return this.invoke('ProceedToNextQuestion', roomCode); }
  async showFinalLeaderboard(roomCode: string) { return this.invoke('ShowFinalLeaderboard', roomCode); }
  async updateAutoShowResults(roomCode: string, autoShowResults: boolean) { return this.invoke('UpdateAutoShowResults', roomCode, autoShowResults); }
  async activateGameSession(roomCode: string) { return this.invoke('ActivateGameSession', roomCode); }
}

export function getHubClient() { return HubClient.instance(); }