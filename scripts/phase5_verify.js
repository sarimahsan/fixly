import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createSSHClient } from '../src/modules/monitoring/ssh_client.js';
import { parseLogLine } from '../src/modules/monitoring/log_reader.js';
import { DedupEngine } from '../src/modules/monitoring/dedup_engine.js';
import { diagnoseIncident } from '../src/modules/ai/diagnosis.js';
import { proposeCodeFix } from '../src/modules/ai/code_fixer.js';
import { GitClient } from '../src/modules/git/git_client.js';
import { verifyRecovery } from '../src/modules/git/recovery.js';
import { MonitoringBroadcaster } from '../src/modules/monitoring/ws_broadcaster.js';
import { readVitalsOnce } from '../src/modules/monitoring/vitals_reader.js';
import { IncidentStatus, WSEventType } from '../src/common/types.js';

class MemoryIncident {
  static store = [];
  static async findOne(query) {
    return this.store.find((item) => item.fingerprint === query.fingerprint && item.status !== IncidentStatus.RESOLVED) || null;
  }
  static async create(doc) {
    const incident = new MemoryIncident(doc);
    this.store.push(incident);
    return incident;
  }
  constructor(doc) {
    Object.assign(this, doc);
    this._id = `incident-${MemoryIncident.store.length + 1}`;
  }
  async save() { return this; }
}

class MemoryOccurrence {
  static store = [];
  static async create(doc) { this.store.push(doc); return doc; }
}

class CaptureBroadcaster extends MonitoringBroadcaster {
  constructor() { super(); this.events = []; }
  broadcast(event, payload) { this.events.push({ event, payload }); return 1; }
}

function patchModelStatics() {
  DedupEngine.prototype.recordOccurrence = async function recordOccurrence(incident, errorEvent, vitalsSnapshot, timestamp) {
    return MemoryOccurrence.create({ incidentId: incident._id, rawLogLine: errorEvent.rawLogLine, serverVitalsSnapshot: vitalsSnapshot, timestamp });
  };
  const oldProcessError = DedupEngine.prototype.processError;
  DedupEngine.prototype.processError = async function processErrorWithMemory(errorEvent, options = {}) {
    const { Incident } = await import('../src/models/Incident.js');
    const originalFindOne = Incident.findOne;
    const originalCreate = Incident.create;
    Incident.findOne = MemoryIncident.findOne.bind(MemoryIncident);
    Incident.create = MemoryIncident.create.bind(MemoryIncident);
    try { return await oldProcessError.call(this, errorEvent, options); }
    finally { Incident.findOne = originalFindOne; Incident.create = originalCreate; }
  };
}

async function verifySyntheticFlow() {
  patchModelStatics();
  const broadcaster = new CaptureBroadcaster();
  const line = '2026-08-12T10:00:00Z ERROR TypeError: Cannot read properties of undefined at src/server/demo_target.js:10:5';
  const first = parseLogLine(line, { serverId: 'phase5-synthetic' });
  const second = parseLogLine(line.replace('10:00:00', '10:00:01'), { serverId: 'phase5-synthetic' });
  assert.ok(first, 'Log Detection parsed an error line');

  const dedup = new DedupEngine({ broadcaster });
  const created = await dedup.processError(first);
  const updated = await dedup.processError(second);
  assert.equal(created.action, 'created', 'Deduplication created first incident');
  assert.equal(updated.action, 'updated', 'Deduplication grouped repeated error');
  assert.equal(updated.incident.occurrenceCount, 2, 'Occurrence counter incremented');

  const diagnosis = await diagnoseIncident(created.incident, { broadcaster, persist: true });
  assert.ok(diagnosis.rootCause, 'AI Diagnosis produced root cause');

  const proposal = await proposeCodeFix(created.incident, diagnosis, {
    repoRoot: process.cwd(),
    targetFilePath: 'src/server/http_utils.js',
    broadcaster,
    persist: true
  });
  assert.ok(proposal.diffPatch.includes('Fixly AI proposal'), 'Git Fix proposal generated a patch');

  const fakeGit = {
    async branch() { return { current: 'main' }; },
    async checkoutLocalBranch() {},
    async add() {},
    async commit() { return { commit: 'phase5syntheticsha' }; }
  };
  const gitResult = await new GitClient({ git: fakeGit }).automateFix(proposal, { push: false, openPR: false });
  assert.equal(gitResult.commitSha, 'phase5syntheticsha', 'Git Fix Commit completed through injected git client');

  const recovery = await verifyRecovery(created.incident, { events: [], windowMs: 1000, broadcaster });
  assert.equal(recovery.resolved, true, 'Auto-Recovery resolved incident after clean window');

  const seenEvents = new Set(broadcaster.events.map((item) => item.event));
  for (const event of [WSEventType.INCIDENT_CREATED, WSEventType.INCIDENT_UPDATED, WSEventType.DIAGNOSIS_CREATED, WSEventType.FIX_PROPOSED, WSEventType.INCIDENT_RESOLVED]) {
    assert.ok(seenEvents.has(event), `Live UI Feed emitted ${event}`);
  }

  return { mode: 'synthetic', events: broadcaster.events.length, incidentId: created.incident._id, commitSha: gitResult.commitSha };
}

async function verifyRemotePrerequisites() {
  const ssh = await createSSHClient({}, { checkKeyFile: true });
  try {
    const logPath = process.env.MONITOR_LOG_PATH || '/var/log/syslog';
    const marker = `FIXLY_PHASE5_${Date.now()}`;
    const escapedMarker = marker.replace(/'/g, `'\\''`);
    const result = await ssh.exec(`printf '%s\\n' '2026-08-12T10:00:00Z ERROR ${escapedMarker} TypeError: Cannot read properties of undefined at src/server/demo_target.js:10:5'`);
    const parsed = parseLogLine(result.stdout, { serverId: process.env.PHASE5_SERVER_ID || 'phase5-remote' });
    assert.ok(parsed, 'Remote SSH Log Detection parsed injected command output');
    const vitals = await readVitalsOnce(ssh, { serverId: parsed.serverId, persist: false });
    assert.ok(Number.isFinite(vitals.cpuUsagePercent), 'Remote SSH vitals reader returned CPU percentage');
    return { mode: 'remote-ssh', host: ssh.connectionConfig.host, logPath, marker, vitals };
  } finally {
    ssh.dispose();
  }
}

async function main() {
  if (process.env.PHASE5_REAL_SSH === '1') {
    const remote = await verifyRemotePrerequisites();
    const synthetic = await verifySyntheticFlow();
    console.log('Phase 5 verification passed:', JSON.stringify({ mode: 'remote-ssh+synthetic-full-flow', remote, synthetic }));
    return;
  }

  const result = await verifySyntheticFlow();
  console.log('Phase 5 verification passed:', JSON.stringify(result));
  console.log('Remote SSH verification note: set PHASE5_REAL_SSH=1 and production SSH credentials to validate live SSH connectivity/vitals, then run the deterministic full-flow harness in the same command.');
}

main().catch((error) => {
  console.error('Phase 5 verification failed:', error);
  process.exitCode = 1;
});
