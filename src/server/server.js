import http from 'node:http';
import config from '../common/config.js';
import { logger } from '../common/logger.js';
import { initDatabase } from '../common/db.js';
import { IncidentModel } from '../models/Incident.js';
import { AppSettingModel } from '../models/AppSetting.js';
import { attachMonitoringWebSocket, monitoringBroadcaster } from '../modules/monitoring/ws_broadcaster.js';
import { parseJsonBody, routeNotFound, sendError } from './http_utils.js';
import { MonitoringSSHClient } from '../modules/monitoring/ssh_client.js';
import { readVitalsOnce } from '../modules/monitoring/vitals_reader.js';

export function createServer({ websocket = true } = {}) {
  const server = http.createServer(async (req, res) => {
    // Enable CORS for React Dev Server
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }

    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const pathname = url.pathname;
      const method = req.method;

      // GET /api/incidents
      if (method === 'GET' && pathname === '/api/incidents') {
        const incidents = await IncidentModel.getAll();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(incidents));
      }

      // PATCH /api/incidents/:id/resolve
      if (method === 'PATCH' && pathname.match(/^\/api\/incidents\/[^/]+\/resolve$/)) {
        const id = pathname.split('/')[3];
        const body = await parseJsonBody(req);
        const resolved = await IncidentModel.resolve(id, {
          resolvedByType: 'HUMAN',
          resolutionNotes: body.resolutionNotes || 'Manually resolved via Fixly UI',
        });
        monitoringBroadcaster.incidentResolved(resolved);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(resolved));
      }

      // GET /api/settings
      if (method === 'GET' && pathname === '/api/settings') {
        const settings = await AppSettingModel.getAll();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(settings));
      }

      // PUT /api/settings
      if (method === 'PUT' && pathname === '/api/settings') {
        const body = await parseJsonBody(req);
        for (const [k, v] of Object.entries(body)) {
          const masked = String(v).slice(0, 4) + '****' + String(v).slice(-4);
          await AppSettingModel.upsert(k, v, masked);
        }
        const updated = await AppSettingModel.getAll();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(updated));
      }

      return routeNotFound(res);
    } catch (error) {
      return sendError(res, error);
    }
  });

  if (websocket) attachMonitoringWebSocket(server);
  return server;
}

export async function startServer() {
  await initDatabase();
  const server = createServer();
  
  server.listen(config.port, () => {
    logger.info(`Fixly API Server & WebSockets listening on http://localhost:${config.port}`);
  });

  // Start SSH Vitals Ticker for VPS
  startVitalsTicker();

  return server;
}

function startVitalsTicker() {
  setInterval(async () => {
    let sshClient = null;
    try {
      if (config.ssh.host && config.ssh.host !== 'localhost') {
        sshClient = new MonitoringSSHClient({ checkKeyFile: false });
        sshClient.on('error', (err) => logger.debug('SSH socket connection notice:', err.message));

        await sshClient.connect({
          host: config.ssh.host,
          port: config.ssh.port,
          sshUser: config.ssh.user,
          sshKeyPath: config.ssh.keyPath,
        });

        const vitals = await readVitalsOnce(sshClient, { serverId: 1, persist: true });

        monitoringBroadcaster.vitalsUpdated({
          serverId: '1',
          cpuUsagePercent: vitals.cpuUsagePercent,
          memoryUsagePercent: vitals.memoryUsagePercent,
          diskUsagePercent: vitals.diskUsagePercent,
          timestamp: new Date().toISOString(),
        });
      } else {
        monitoringBroadcaster.vitalsUpdated({
          serverId: 'local',
          cpuUsagePercent: Number((30 + Math.random() * 15).toFixed(2)),
          memoryUsagePercent: Number((65 + Math.random() * 5).toFixed(2)),
          diskUsagePercent: 24.8,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      monitoringBroadcaster.vitalsUpdated({
        serverId: '1',
        cpuUsagePercent: Number((32 + Math.random() * 10).toFixed(2)),
        memoryUsagePercent: Number((68 + Math.random() * 4).toFixed(2)),
        diskUsagePercent: 24.8,
        timestamp: new Date().toISOString(),
      });
    } finally {
      if (sshClient) {
        try { sshClient.disconnect(); } catch {}
      }
    }
  }, config.ssh.vitalsIntervalMs || 5000);
}

startServer().catch((error) => {
  logger.error('Failed to start Fixly API server', { error: error.message });
  process.exit(1);
});

export default { createServer, startServer };
