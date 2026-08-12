import { useEffect, useRef, useState } from 'react';
import { wsUrl } from '../api.js';

export function useFixlySocket(onEvent) {
  const [connected, setConnected] = useState(false);
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    const socket = new WebSocket(wsUrl());
    socket.onopen = () => setConnected(true);
    socket.onclose = () => setConnected(false);
    socket.onerror = () => setConnected(false);
    socket.onmessage = (message) => {
      try { handlerRef.current?.(JSON.parse(message.data)); } catch (error) { console.warn('Bad websocket payload', error); }
    };
    return () => socket.close();
  }, []);

  return connected;
}
