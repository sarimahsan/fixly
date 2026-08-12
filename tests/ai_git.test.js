import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { diagnoseIncident } from '../src/modules/ai/diagnosis.js';
import { generateUnifiedDiff, lineChanges, summarizeDiff } from '../src/modules/ai/diff_generator.js';
import { assertAllowedTarget, extractTargetPathFromStack, proposeCodeFix } from '../src/modules/ai/code_fixer.js';
import { GitClient, slugBranchName } from '../src/modules/git/git_client.js';
import { RecoveryMonitor, containsIncidentFingerprint, verifyRecovery } from '../src/modules/git/recovery.js';
import { IncidentStatus, WSEventType } from '../src/common/types.js';

console.log('--- Running Phase 3 AI & Git Automation Tests ---');

const incident = {
  _id: 'inc-123456789',
  fingerprint: 'fp-db-timeout',
  title: 'UnhandledPromiseRejectionError: Connection Timeout',
  errorType: 'UnhandledPromiseRejectionError',
  normalizedMessage: 'Connection Timeout at Database.connect',
  rawStackTrace: 'Error at src/service/db.js:4:10',
  occurrenceCount: 5,
  severity: 'MEDIUM'
};

const events = [];
const diagnosis = await diagnoseIncident(incident, { broadcaster: { broadcast: (event, payload) => events.push({ event, payload }) } });
assert.equal(diagnosis.severity, 'HIGH');
assert.ok(diagnosis.confidenceScore > 0.8);
assert.equal(diagnosis.automatableFixExists, true);
assert.equal(events[0].event, WSEventType.DIAGNOSIS_CREATED);
console.log('✓ AI root-cause diagnosis emits deterministic diagnosis payloads.');

const original = 'async function run() {\n  db.connect()\n}\n';
const proposed = 'async function run() {\n  await connectWithTimeout(db, 5000)\n}\n';
const changes = lineChanges(original, proposed);
assert.ok(changes.some((change) => change.type === 'remove'));
assert.ok(changes.some((change) => change.type === 'add'));
const diff = generateUnifiedDiff({ originalContent: original, proposedContent: proposed, filePath: 'src/service/db.js' });
assert.ok(diff.includes('--- a/src/service/db.js'));
assert.deepEqual(summarizeDiff(diff), { additions: 1, deletions: 1 });
console.log('✓ Line-by-line unified diff generation verified.');

assert.equal(assertAllowedTarget('src/service/db.js'), 'src/service/db.js');
assert.throws(() => assertAllowedTarget('../secrets.env'), /Unsafe target/);
assert.equal(extractTargetPathFromStack('/srv/app/src/service/db.js:4:10'), 'src/service/db.js');

const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'fixly-ai-git-'));
await fs.mkdir(path.join(tmpRoot, 'src/service'), { recursive: true });
await fs.writeFile(path.join(tmpRoot, 'src/service/db.js'), original, 'utf8');
const fixEvents = [];
const proposal = await proposeCodeFix(incident, diagnosis, {
  repoRoot: tmpRoot,
  broadcaster: { broadcast: (event, payload) => fixEvents.push({ event, payload }) }
});
assert.equal(proposal.targetFilePath, 'src/service/db.js');
assert.ok(proposal.proposedCodeSnippet.includes('connectWithTimeout'));
assert.ok(proposal.diffPatch.includes('+  await connectWithTimeout'));
assert.equal(fixEvents[0].event, WSEventType.FIX_PROPOSED);
console.log('✓ AI code-fix proposal maps stack traces to safe files and emits fix events.');

assert.equal(slugBranchName('Fix/INC 123 DB Timeout!'), 'fix/inc-123-db-timeout');
const gitCalls = [];
const fakeGit = {
  async branch() { return { current: 'main' }; },
  async checkoutLocalBranch(branchName) { gitCalls.push(['checkoutLocalBranch', branchName]); },
  async add(filePath) { gitCalls.push(['add', filePath]); },
  async commit(message) { gitCalls.push(['commit', message]); return { commit: 'abc123' }; },
  async push(...args) { gitCalls.push(['push', ...args]); }
};
const gitClient = new GitClient({ repoRoot: tmpRoot, git: fakeGit });
const commit = await gitClient.commitProposal(proposal, { branchName: 'fix/inc 123 db timeout' });
assert.equal(commit.branchName, 'fix/inc-123-db-timeout');
assert.equal(commit.commitSha, 'abc123');
assert.deepEqual(gitCalls.map((call) => call[0]), ['checkoutLocalBranch', 'add', 'commit']);
assert.equal(await fs.readFile(path.join(tmpRoot, 'src/service/db.js'), 'utf8'), proposal.proposedCodeSnippet);
console.log('✓ Git client branch, apply, and commit flow verified with fake simple-git.');

const recoveryIncident = {
  _id: 'inc-123456789',
  fingerprint: 'fp-db-timeout',
  errorType: 'UnhandledPromiseRejectionError',
  normalizedMessage: 'Connection Timeout at Database.connect',
  status: IncidentStatus.IN_PROGRESS,
  async save() { this.saved = true; }
};
assert.equal(containsIncidentFingerprint({ message: 'UnhandledPromiseRejectionError happened' }, recoveryIncident), true);
const unresolved = await verifyRecovery(recoveryIncident, { events: [{ message: 'UnhandledPromiseRejectionError happened', timestamp: new Date().toISOString() }], windowMs: 1000 });
assert.equal(unresolved.resolved, false);
const recoveryEvents = [];
const resolved = await verifyRecovery(recoveryIncident, {
  events: [],
  windowMs: 1000,
  broadcaster: { broadcast: (event, payload) => recoveryEvents.push({ event, payload }) }
});
assert.equal(resolved.resolved, true);
assert.equal(recoveryIncident.status, IncidentStatus.RESOLVED);
assert.equal(recoveryIncident.saved, true);
assert.equal(recoveryEvents[0].event, WSEventType.INCIDENT_RESOLVED);

const reader = new EventEmitter();
const monitor = new RecoveryMonitor({ incident: recoveryIncident, logReader: reader, windowMs: 1000 });
monitor.start();
reader.emit('error-log', { message: 'different error', timestamp: new Date().toISOString() });
assert.equal(monitor.events.length, 1);
monitor.stop();
console.log('✓ Auto-recovery monitor resolves incidents only after clean recovery windows.');

console.log('PASSED: Phase 3 AI & Git Automation Test Suite!');
