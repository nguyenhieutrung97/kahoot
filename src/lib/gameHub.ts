"use client";

import * as signalR from '@microsoft/signalr';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

let singletonConnection: signalR.HubConnection | null = null;
let starting = false;

export function getGameHub(): signalR.HubConnection {
  if (!singletonConnection) {
    singletonConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/gameHub`, {
        withCredentials: true,
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();
  }
  return singletonConnection;
}

export async function ensureStarted(conn: signalR.HubConnection): Promise<void> {
  if (conn.state === signalR.HubConnectionState.Connected) return;
  if (starting) return;
  starting = true;
  try {
    await conn.start();
  } finally {
    starting = false;
  }
}


