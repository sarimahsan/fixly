import { WebSocketServer, WebSocket } from 'ws';
import logger from '../../common/logger.js';
import { WSEventType } from '../../common/types.js';

const SUPPORTED_WS_EVENTS = new Set([...Object.values(WSEventType), 'monitoring:ready']);

export function createMonitoringPayload(event, payload) {
  if (!SUPPORTED_WS_EVENTS.has(event)) {
    throw new Error(`Invalid monitoring WebSocket event type: ${event}`);
  }
  return {
    event,
    payload,
    timestamp: new Date().toISOString()
  };
}

export class MonitoringBroadcaster {
  constructor({ path = '/ws' } = {}) {
    this.path = path;
    this.wss = null;
  }

  attach(server) {
    if (this.wss) return this;
    this.wss = new WebSocketServer({ server, path: this.path });
    this.wss.on('connection', (socket, req) => {
      logger.info('Monitoring WebSocket client connected', { path: req.url });
      socket.send(JSON.stringify(createMonitoringPayload('monitoring:ready', { ok: true })));
      socket.on('error', (error) => logger.warn('WebSocket client error', { error: error.message }));
    });
    this.wss.on('error', (error) => logger.error('Monitoring WebSocket server error', { error: error.message }));
    return this;
  }

  broadcast(event, payload) {
    const message = JSON.stringify(createMonitoringPayload(event, payload));
    let delivered = 0;
    for (const client of this.wss?.clients || []) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
        delivered += 1;
      }
    }
    return delivered;
  }

  incidentCreated(payload) {
    return this.broadcast(WSEventType.INCIDENT_CREATED, payload);
  }

  incidentUpdated(payload) {
    return this.broadcast(WSEventType.INCIDENT_UPDATED, payload);
  }

  vitalsUpdated(payload) {
    return this.broadcast(WSEventType.VITALS_UPDATED, payload);
  }

  close() {
    this.wss?.close();
    this.wss = null;
  }
}

export const monitoringBroadcaster = new MonitoringBroadcaster();

export function attachMonitoringWebSocket(server, options = {}) {
  if (options.broadcaster) return options.broadcaster.attach(server);
  if (options.path) monitoringBroadcaster.path = options.path;
  return monitoringBroadcaster.attach(server);
}

export default {
  MonitoringBroadcaster,
  attachMonitoringWebSocket,
  createMonitoringPayload,
  monitoringBroadcaster
};
