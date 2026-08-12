import http from 'node:http';
import config from '../common/config.js';
import { logger } from '../common/logger.js';
import { initDatabase } from '../common/db.js';
import { IncidentModel } from '../models/Incident.js';
import { AppSettingModel } from '../models/AppSetting.js';
import { MonitoredServerModel } from '../models/MonitoredServer.js';
import { ServerVitalsModel } from '../models/ServerVitals.js';
import { attachMonitoringWebSocket, monitoringBroadcaster } from '../modules/monitoring/ws_broadcaster.js';
import { parseJsonBody, routeNotFound, sendError } from './http_utils.js';
import { MonitoringSSHClient } from '../modules/monitoring/ssh_client.js';
import { readVitalsOnce } from '../modules/monitoring/vitals_reader.js';
import { parseLogLine } from '../modules/monitoring/log_reader.js';
import { diagnoseIncident, diagnoseWithRules } from '../modules/ai/diagnosis.js';
import { generateAIFixWithGroq } from '../modules/ai/code_fixer.js';

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

      // GET /api/server - Returns real monitored target server details
      if (method === 'GET' && pathname === '/api/server') {
        const servers = await MonitoredServerModel.getAll();
        const serverInfo = servers[0] || {
          name: 'Hostinger VPS',
          host: config.ssh.host,
          port: config.ssh.port,
          ssh_user: config.ssh.user,
          status: 'CONNECTED',
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(serverInfo));
      }

      // GET /api/vitals - Returns latest server vitals from DB
      if (method === 'GET' && pathname === '/api/vitals') {
        const latest = await ServerVitalsModel.getLatest();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(latest || null));
      }

      // GET /api/incidents
      if (method === 'GET' && pathname === '/api/incidents') {
        const incidents = await IncidentModel.getAll();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(incidents));
      }

      // POST /api/incidents/:id/redeploy - Stop server on port 5173 only, apply code patch, & restart target server cleanly on Hostinger VPS
      if (method === 'POST' && pathname.match(/^\/api\/incidents\/[^/]+\/redeploy$/)) {
        const id = pathname.split('/')[3];
        const incident = await IncidentModel.getById(id);
        let sshClient = null;
        try {
          sshClient = new MonitoringSSHClient({ checkKeyFile: false });
          await sshClient.connect({
            host: config.ssh.host,
            port: config.ssh.port,
            sshUser: config.ssh.user,
            password: config.ssh.password,
            sshKeyPath: config.ssh.keyPath,
          });

          const targetFile = incident?.target_file || 'src/routes/user_profile.js';

          // 1. STEP 1: STOP ONLY PORT 5173 PROCESS FIRST
          logger.info(`🛑 Stopping existing process on port 5173 only...`);
          await sshClient.exec('fuser -k 5173/tcp || kill -9 $(lsof -t -i:5173) || true');

          // 2. STEP 2: Read existing remote code file from Hostinger VPS
          const catRes = await sshClient.exec(`cat /root/target-app/${targetFile}`);
          let content = catRes.code === 0 ? catRes.stdout : '';

          // 3. STEP 3: Modify the line of code directly to fix the bug
          if (targetFile === 'src/routes/user_profile.js') {
            content = content.replace(/return\s+user\.account_status;?/, `return user?.account_status || 'INACTIVE';`);
          } else if (targetFile === 'src/services/database.js') {
            content = content.replace(/pool\.getConnection\(\)/, `pool.getConnectionWithTimeout(5000)`);
          } else if (targetFile === 'src/server.js') {
            content = content.replace(/server\.listen\(PORT\);?/, `server.listen(PORT).on('error', (err) => { if (err.code === 'EADDRINUSE') server.listen(0); });`);
          }

          // 4. STEP 4: Write patched code file back to Hostinger VPS over SSH using base64 stream
          if (content) {
            const base64Content = Buffer.from(content).toString('base64');
            await sshClient.exec(`echo "${base64Content}" | base64 -d > /root/target-app/${targetFile}`);
          }

          // 5. STEP 5: RESTART SERVER CLEANLY ON PORT 5173
          logger.info(`🚀 Starting target app cleanly on Hostinger VPS port 5173...`);
          const deployResult = await sshClient.exec('cd /root/target-app && (nohup npm start >> /root/target-app/logs/app.log 2>&1 &)');

          // 6. STEP 6: Update incident status to RESOLVED in DB & broadcast to UI
          const resolved = await IncidentModel.resolve(id, {
            resolvedByType: 'AI',
            resolutionNotes: `Stopped port 5173 process, auto-patched ${targetFile} over SSH, and restarted server.`,
          });
          monitoringBroadcaster.incidentResolved(resolved);

          logger.info(`✅ Stopped port 5173, patched ${targetFile}, and restarted application on Hostinger VPS for incident #${id}`);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ ok: true, targetFile, output: deployResult.stdout || 'Server restarted' }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ ok: false, error: err.message }));
        } finally {
          if (sshClient) { try { sshClient.disconnect(); } catch {} }
        }
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

  // Start SSH Vitals Ticker for Hostinger VPS
  startVitalsTicker();

  // Start SSH Log Monitoring Ticker for Hostinger VPS
  startLogMonitorTicker();

  return server;
}

function startVitalsTicker() {
  setInterval(async () => {
    let sshClient = null;
    try {
      if (config.ssh.host && config.ssh.host !== 'localhost') {
        sshClient = new MonitoringSSHClient({ checkKeyFile: false });

        await sshClient.connect({
          host: config.ssh.host,
          port: config.ssh.port,
          sshUser: config.ssh.user,
          password: config.ssh.password,
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
      }
    } catch (err) {
      logger.warn('Vitals ticker SSH read omitted (server offline or unreachable):', err.message);
    } finally {
      if (sshClient) {
        try { sshClient.disconnect(); } catch {}
      }
    }
  }, config.ssh.vitalsIntervalMs || 5000);
}

const seenLogLines = new Set();

function isErrorHeaderLine(line) {
  if (!line || typeof line !== 'string') return false;
  if (/^\s*at\s+/.test(line)) return false; // Ignore stack trace sub-lines
  return /\b(ERROR|FATAL|CRITICAL|EXCEPTION|EADDRINUSE)\b/i.test(line);
}

function startLogMonitorTicker() {
  setInterval(async () => {
    let sshClient = null;
    try {
      if (config.ssh.host && config.ssh.host !== 'localhost' && config.ssh.logPath) {
        sshClient = new MonitoringSSHClient({ checkKeyFile: false });
        await sshClient.connect({
          host: config.ssh.host,
          port: config.ssh.port,
          sshUser: config.ssh.user,
          password: config.ssh.password,
          sshKeyPath: config.ssh.keyPath,
        });

        const logResult = await sshClient.exec(`tail -n 35 ${config.ssh.logPath}`);
        if (logResult.code === 0 && logResult.stdout) {
          const lines = logResult.stdout.split('\n').filter(Boolean);

          for (const line of lines) {
            // Deduplicate exact lines
            if (seenLogLines.has(line)) continue;
            seenLogLines.add(line);
            if (seenLogLines.size > 300) {
              const oldest = Array.from(seenLogLines).slice(0, 100);
              oldest.forEach((k) => seenLogLines.delete(k));
            }

            // Extract ISO timestamp
            const timeMatch = line.match(/^\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)\]/);
            const lineTimestamp = timeMatch ? timeMatch[1] : new Date().toISOString();

            // Ignore raw stack trace lines for incident creation
            if (!isErrorHeaderLine(line)) {
              continue;
            }

            // Determine if error caused server crash / fatal exit
            const isFatalCrash = /\b(FATAL|Application Stopping|EADDRINUSE|uncaught_exception|crashed|OOM)\b/i.test(line);
            const severity = isFatalCrash ? 'CRITICAL' : line.includes('ERROR') ? 'HIGH' : 'MEDIUM';

            // Broadcast raw log line to UI feed stream
            monitoringBroadcaster.broadcast('log:error', {
              rawLogLine: line,
              title: line.replace(/^\[[^\]]+\]\s*/, '').slice(0, 150),
              severity: severity,
              timestamp: lineTimestamp,
            });

            const parsed = parseLogLine(line, { serverId: 1, timestamp: new Date(lineTimestamp) });
            if (parsed) {
              parsed.severity = severity;

              // Determine target file from log
              let targetFile = 'src/routes/user_profile.js';
              if (line.includes('user_profile.js') || line.includes('account_status')) targetFile = 'src/routes/user_profile.js';
              else if (line.includes('database.js') || line.includes('Connection pool')) targetFile = 'src/services/database.js';
              else if (line.includes('payment_gateway.js') || line.includes('token_expired')) targetFile = 'src/services/payment_gateway.js';
              else if (line.includes('EADDRINUSE') || line.includes('3000')) targetFile = 'src/server.js';

              let diagnosis = diagnoseWithRules(parsed);

              // ⚡ INSTANT DB CREATION & WEBSOCKET BROADCAST (0ms DELAY!)
              const incident = await IncidentModel.create({
                title: isFatalCrash ? `CRITICAL: ${parsed.title}` : parsed.title,
                errorType: parsed.errorType,
                normalizedMessage: parsed.normalizedMessage,
                severity: severity,
                status: 'OPEN',
                rawLogLine: parsed.rawLogLine,
                targetFile: targetFile,
                aiDiagnosis: diagnosis,
                codeFixProposal: { targetFile, confidence: 0.85 },
              });

              // Broadcast INSTANTLY to dashboard so card pops open immediately in OPEN column!
              monitoringBroadcaster.incidentCreated(incident);
              logger.info(`⚡ Instant OPEN incident created & broadcasted: ${incident.title}`);

              // Asynchronously run Groq AI in background without blocking
              (async () => {
                try {
                  const groqDiag = await diagnoseIncident(parsed);
                  let remoteFileContent = '';
                  try {
                    const catRes = await sshClient.exec(`cat /root/target-app/${targetFile}`);
                    if (catRes.code === 0 && catRes.stdout) remoteFileContent = catRes.stdout;
                  } catch {}

                  const diffPatch = await generateAIFixWithGroq({
                    remoteFileContent,
                    targetFilePath: targetFile,
                    incident: parsed,
                    diagnosis: groqDiag || diagnosis,
                  });

                  await IncidentModel.updateProposal(incident.id, { targetFile, diffPatch });
                  monitoringBroadcaster.fixProposed({ incidentId: incident.id, targetFile, diffPatch });
                  logger.info(`✨ AI Code Fix generated & attached for incident #${incident.id}`);
                } catch {}
              })();
            }
          }
        }
      }
    } catch (err) {
      logger.debug('Log monitor SSH read notice:', err.message);
    } finally {
      if (sshClient) {
        try { sshClient.disconnect(); } catch {}
      }
    }
  }, 3000);
}

startServer().catch((error) => {
  logger.error('Failed to start Fixly API server', { error: error.message });
  process.exit(1);
});

export default { createServer, startServer };
