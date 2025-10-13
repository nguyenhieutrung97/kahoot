import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HubClient, getHubClient } from './HubClient';

// Mock underlying gameHub module functions
vi.mock('./gameHub', () => {
  const onHandlers: Record<string, Function[]> = {};
  const fakeConn = {
    on: (e: string, cb: any) => { (onHandlers[e] ||= []).push(cb); },
    off: (e: string, cb?: any) => { onHandlers[e] = (onHandlers[e]||[]).filter(f => f !== cb); },
    invoke: vi.fn(async () => 'ok')
  } as any;
  return {
    getGameHub: () => fakeConn,
    ensureStarted: vi.fn(async () => {}),
    forceReconnect: vi.fn(async () => {}),
  };
});

describe('HubClient', () => {
  beforeEach(async () => {
    // reset singleton for isolation
    (HubClient as any)._instance = null;
    // clear mock call counts
    const mod = await import('./gameHub');
    (mod.ensureStarted as any).mockClear();
    (mod.forceReconnect as any).mockClear();
  });

  it('creates singleton instance', () => {
    const a = getHubClient();
    const b = getHubClient();
    expect(a).toBe(b);
  });

  it('starts connection only once', async () => {
    const client = getHubClient();
    const { ensureStarted } = await import('./gameHub');
    await client.start();
    await client.start();
    expect((ensureStarted as any).mock.calls.length).toBe(1);
  });

  it('reconnect calls forceReconnect then start', async () => {
    const client = getHubClient();
    const mod = await import('./gameHub');
    await client.reconnect();
    expect((mod.forceReconnect as any).mock.calls.length).toBe(1);
    expect((mod.ensureStarted as any).mock.calls.length).toBe(1);
  });

  it('invokes hub methods through wrapper', async () => {
    const client = getHubClient();
    const result = await client.createGameRoom('game1');
    expect(result).toBe('ok');
  });
});