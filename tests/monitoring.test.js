import assert from 'node:assert/strict';
import http from 'node:http';
import { WebSocket } from 'ws';
import mongoose from 'mongoose';
import { buildSSHConfig, expandHome, MonitoringSSHClient } from '../src/modules/monitoring/ssh_client.js';
import { inferErrorType, normalizeLogMessage, parseLogLine, LogReader } from '../src/modules/monitoring/log_reader.js';
import { parseKeyValueVitals, parseVitalsOutput, readVitalsOnce } from '../src/modules/monitoring/vitals_reader.js';
import { buildFingerprintSource, DedupEngine, fingerprintError } from '../src/modules/monitoring/dedup_engine.js';
import { MonitoringBroadcaster } from '../src/modules/monitoring/ws_broadcaster.js';
import { WSEventType } from '../src/common/types.js';

console.log('--- Running Phase 2 Monitoring Pipeline Tests ---');

assert.ok(expandHome('~/id_rsa').includes('id_rsa'));
const sshConfig = buildSSHConfig({ host: 'example.test', port: 2222, sshUser: 'ubuntu', sshKeyPath: '/tmp/key' });
assert.equal(sshConfig.host, 'example.test');
assert.equal(sshConfig.username, 'ubuntu');
assert.equal(sshConfig.port, 2222);

const fakeNodeSSH = {
  connectedWith: null,
  async connect(options) { this.connectedWith = options; },
  async execCommand(command) { return { code: 0, stdout: `ran:${command}`, stderr: '' }; },
  dispose() { this.disposed = true; }
};
const sshClient = new MonitoringSSHClient({ ssh: fakeNodeSSH, checkKeyFile: false });
await sshClient.connect({ host: 'localhost', sshUser: 'me', sshKeyPath: '/fake/key' });
assert.equal(fakeNodeSSH.connectedWith.username, 'me');
assert.equal((await sshClient.exec('uptime')).stdout, 'ran:uptime');
console.log('✓ SSH client configuration and command wrapper verified.');

const rawLineA = '2026-08-12T10:00:01Z [ERROR] UnhandledPromiseRejectionError: Connection 42 timeout at Database.connect (/srv/app/db.js:88:13)';
const rawLineB = '2026-08-12T10:05:10Z [ERROR] UnhandledPromiseRejectionError: Connection 77 timeout at Database.connect (/srv/app/db.js:91:20)';
assert.equal(inferErrorType(rawLineA), 'UnhandledPromiseRejectionError');
assert.equal(normalizeLogMessage(rawLineA), normalizeLogMessage(rawLineB));
const parsedLog = parseLogLine(rawLineA, { serverId: 'srv-1' });
assert.equal(parsedLog.errorType, 'UnhandledPromiseRejectionError');
assert.equal(parsedLog.serverId, 'srv-1');
assert.equal(parseLogLine('info: user logged in'), null);

const reader = new LogReader({ sshClient, serverId: 'srv-1' });
const emitted = [];
reader.on('error-log', (event) => emitted.push(event));
reader.consume(`${rawLineA}\ninfo line\n${rawLineB}\n`);
assert.equal(emitted.length, 2);
console.log('✓ Continuous log parser and error filtering verified.');

assert.deepEqual(parseVitalsOutput('{"cpuUsagePercent":34.234,"memoryUsagePercent":68.5,"diskUsagePercent":42}'), {
  cpuUsagePercent: 34.23,
  memoryUsagePercent: 68.5,
  diskUsagePercent: 42
});
assert.deepEqual(parseKeyValueVitals('CPU 10.1% RAM 20.2% DISK 30.3%'), {
  cpuUsagePercent: 10.1,
  memoryUsagePercent: 20.2,
  diskUsagePercent: 30.3
});
const vitalsSSH = { async exec() { return { stdout: '{"cpu":11,"mem":22,"disk":33}', stderr: '' }; } };
const vitals = await readVitalsOnce(vitalsSSH, { serverId: undefined, persist: false });
assert.equal(vitals.cpuUsagePercent, 11);
console.log('✓ Vitals parser and one-shot reader verified.');

assert.ok(buildFingerprintSource(parsedLog).includes('unhandledpromiserejectionerror'));
assert.equal(fingerprintError(parsedLog), fingerprintError(parseLogLine(rawLineB)));

const serverId = new mongoose.Types.ObjectId();
const fakeIncident = {
  _id: new mongoose.Types.ObjectId(),
  fingerprint: null,
  title: parsedLog.title,
  errorType: parsedLog.errorType,
  normalizedMessage: parsedLog.normalizedMessage,
  severity: parsedLog.severity,
  status: 'OPEN',
  occurrenceCount: 1,
  firstSeenAt: new Date(),
  lastSeenAt: new Date(),
  async save() { this.saved = true; }
};
const originalFindOne = mongoose.models.Incident.findOne;
const originalCreate = mongoose.models.Incident.create;
const originalOccurrenceCreate = mongoose.models.IncidentOccurrence.create;
try {
  let storedIncident = null;
  mongoose.models.Incident.findOne = async () => storedIncident;
  mongoose.models.Incident.create = async (doc) => {
    storedIncident = { ...fakeIncident, ...doc, _id: fakeIncident._id };
    return storedIncident;
  };
  mongoose.models.IncidentOccurrence.create = async (doc) => ({ _id: new mongoose.Types.ObjectId(), ...doc });
  const events = [];
  const engine = new DedupEngine({ broadcaster: { broadcast: (event, payload) => events.push({ event, payload }) } });
  const created = await engine.processError({ ...parsedLog, serverId });
  assert.equal(created.action, 'created');
  assert.equal(events[0].event, WSEventType.INCIDENT_CREATED);
  const updated = await engine.processError({ ...parseLogLine(rawLineB), serverId });
  assert.equal(updated.action, 'updated');
  assert.equal(storedIncident.occurrenceCount, 2);
  assert.equal(events[1].event, WSEventType.INCIDENT_UPDATED);
} finally {
  mongoose.models.Incident.findOne = originalFindOne;
  mongoose.models.Incident.create = originalCreate;
  mongoose.models.IncidentOccurrence.create = originalOccurrenceCreate;
}
console.log('✓ SHA-256 fingerprinting and incident deduplication verified.');

const server = http.createServer((req, res) => res.end('ok'));
const broadcaster = new MonitoringBroadcaster({ path: '/ws' }).attach(server);
await new Promise((resolve) => server.listen(0, resolve));
const { port } = server.address();
const messages = [];
const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
ws.on('message', (data) => messages.push(JSON.parse(data.toString())));
await new Promise((resolve) => ws.once('open', resolve));
await new Promise((resolve) => setTimeout(resolve, 25));
const delivered = broadcaster.vitalsUpdated({ serverId: 'srv-1', cpuUsagePercent: 12, memoryUsagePercent: 34, diskUsagePercent: 56, timestamp: new Date().toISOString() });
await new Promise((resolve) => setTimeout(resolve, 25));
assert.equal(delivered, 1);
assert.ok(messages.find((message) => message.event === WSEventType.VITALS_UPDATED));
ws.close();
broadcaster.close();
await new Promise((resolve) => server.close(resolve));
console.log('✓ WebSocket broadcaster verified.');

console.log('PASSED: Phase 2 Monitoring Pipeline Test Suite!');
