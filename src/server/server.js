import http from 'node:http';
import config from '../common/config.js';
import logger from '../common/logger.js';
import { connectDB } from '../common/db.js';
import { loginHandler, requireAuthenticated } from '../modules/auth/auth_service.js';
import { requireAdmin, requireViewer } from '../modules/auth/rbac_middleware.js';
import { getSettingsHandler, putSettingsHandler } from '../modules/auth/settings_service.js';
import { attachMonitoringWebSocket } from '../modules/monitoring/ws_broadcaster.js';
import { parseJsonBody, routeNotFound, runHandlers, sendError } from './http_utils.js';

const routes = new Map([
  ['POST /api/auth/login', [loginHandler]],
  ['GET /api/settings', [requireAuthenticated, requireViewer, getSettingsHandler]],
  ['PUT /api/settings', [requireAuthenticated, requireAdmin, putSettingsHandler]]
]);

export function createServer({ websocket = true } = {}) {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const key = `${req.method} ${url.pathname}`;
      const handlers = routes.get(key);
      if (!handlers) return routeNotFound(res);

      req.query = Object.fromEntries(url.searchParams.entries());
      req.body = ['POST', 'PUT', 'PATCH'].includes(req.method) ? await parseJsonBody(req) : {};
      return runHandlers(req, res, handlers);
    } catch (error) {
      return sendError(res, error);
    }
  });

  if (websocket) attachMonitoringWebSocket(server);
  return server;
}

export async function startServer() {
  await connectDB();
  const server = createServer();
  server.listen(config.port, () => {
    logger.info(`Fixly API server listening on port ${config.port}`);
  });
  return server;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch((error) => {
    logger.error('Failed to start Fixly API server', { error: error.message });
    process.exit(1);
  });
}

export default { createServer, startServer };
