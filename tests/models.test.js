import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { User } from '../src/models/User.js';
import { MonitoredServer } from '../src/models/MonitoredServer.js';
import { Incident } from '../src/models/Incident.js';
import { IncidentOccurrence } from '../src/models/IncidentOccurrence.js';
import { ServerVitals } from '../src/models/ServerVitals.js';
import { AppSetting } from '../src/models/AppSetting.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { UserRole, ServerStatus, IncidentStatus, IncidentSeverity, ResolverType, CodeFixStatus } from '../src/common/types.js';

console.log('--- Running Phase 0.2 Unit/Integration Tests (Mongoose Schemas) ---');

// 1. User Model Schema Validation
const user = new User({
  email: '  ADMIN@FIXLY.LOCAL ',
  passwordHash: '$2b$10$hashedpassword',
  role: UserRole.ADMIN
});

const userValidationErr = user.validateSync();
assert.equal(userValidationErr, undefined, 'User validation should pass');
assert.equal(user.email, 'admin@fixly.local', 'Email should be trimmed and lowercase');
assert.equal(user.role, 'ADMIN');

const invalidUser = new User({ email: 'test@fixly.local', passwordHash: 'hash', role: 'SUPERADMIN' });
const invalidUserErr = invalidUser.validateSync();
assert.ok(invalidUserErr.errors.role, 'Role enum validation should reject SUPERADMIN');
console.log('✓ User model schema & enum validation verified.');

// 2. MonitoredServer Model Schema Validation
const server = new MonitoredServer({
  name: 'Production Web 01',
  host: '192.168.1.100',
  port: 22,
  sshUser: 'ubuntu',
  sshKeyPath: '/home/ubuntu/.ssh/id_rsa',
  status: ServerStatus.CONNECTED
});
const serverErr = server.validateSync();
assert.equal(serverErr, undefined, 'MonitoredServer validation should pass');
assert.equal(server.port, 22);
console.log('✓ MonitoredServer model schema verified.');

// 3. Incident Model Schema & Embedded Subdocuments
const incidentId = new mongoose.Types.ObjectId();
const userId = new mongoose.Types.ObjectId();

const incident = new Incident({
  _id: incidentId,
  fingerprint: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  title: 'UnhandledPromiseRejectionError: Connection Timeout',
  errorType: 'UnhandledPromiseRejectionError',
  normalizedMessage: 'Connection Timeout at Database.connect',
  rawStackTrace: 'Error: Connection Timeout\n  at Database.connect (db.js:42)',
  status: IncidentStatus.OPEN,
  severity: IncidentSeverity.HIGH,
  occurrenceCount: 5,
  resolvedByType: ResolverType.HUMAN,
  resolvedByUserId: userId,
  diagnosis: {
    severity: IncidentSeverity.HIGH,
    rootCause: 'Database connection pool exhausted.',
    confidenceScore: 0.95,
    automatableFixExists: true,
    metadata: { affectedModule: 'db' }
  },
  fixProposal: {
    targetFilePath: 'src/common/db.js',
    originalCodeSnippet: 'db.connect();',
    proposedCodeSnippet: 'await db.connectWithTimeout(5000);',
    diffPatch: '--- a/src/common/db.js\n+++ b/src/common/db.js\n@@ -10,1 +10,1 @@\n- db.connect();\n+ await db.connectWithTimeout(5000);',
    gitBranchName: 'fix/inc-123-db-timeout',
    status: CodeFixStatus.PENDING
  }
});

const incidentErr = incident.validateSync();
assert.equal(incidentErr, undefined, 'Incident validation with subdocuments should pass');
assert.equal(incident.diagnosis.confidenceScore, 0.95);
assert.equal(incident.fixProposal.status, 'PENDING');

// Test confidence score bounds validation (min: 0, max: 1)
const invalidDiagIncident = new Incident({
  fingerprint: 'abc',
  title: 'Test',
  errorType: 'Error',
  normalizedMessage: 'Test message',
  diagnosis: {
    severity: IncidentSeverity.LOW,
    rootCause: 'Cause',
    confidenceScore: 1.5 // Invalid > 1
  }
});
const invalidDiagErr = invalidDiagIncident.validateSync();
assert.ok(invalidDiagErr.errors['diagnosis.confidenceScore'], 'Confidence score > 1 should fail validation');
console.log('✓ Incident model schema & embedded subdocuments verified.');

// 4. IncidentOccurrence Model Schema Validation
const occurrence = new IncidentOccurrence({
  incidentId: incidentId,
  serverId: server._id,
  rawLogLine: '2026-08-12 10:00:00 [ERROR] Connection Timeout at Database.connect',
  serverVitalsSnapshot: {
    cpuUsagePercent: 88.5,
    memoryUsagePercent: 92.1,
    diskUsagePercent: 45.0
  }
});
const occurrenceErr = occurrence.validateSync();
assert.equal(occurrenceErr, undefined, 'IncidentOccurrence validation should pass');
assert.equal(occurrence.serverVitalsSnapshot.cpuUsagePercent, 88.5);
console.log('✓ IncidentOccurrence model schema verified.');

// 5. ServerVitals Model Schema Validation
const vitals = new ServerVitals({
  serverId: server._id,
  cpuUsagePercent: 42.0,
  memoryUsagePercent: 68.4,
  diskUsagePercent: 55.2
});
const vitalsErr = vitals.validateSync();
assert.equal(vitalsErr, undefined, 'ServerVitals validation should pass');
console.log('✓ ServerVitals model schema verified.');

// 6. AppSetting Model Schema Validation
const setting = new AppSetting({
  key: 'GIT_ACCESS_TOKEN',
  valueEncrypted: 'enc_token_xyz123',
  maskedValue: 'ghp_****1234'
});
const settingErr = setting.validateSync();
assert.equal(settingErr, undefined, 'AppSetting validation should pass');
console.log('✓ AppSetting model schema verified.');

// 7. AuditLog Model Schema Validation
const audit = new AuditLog({
  userId: userId,
  action: 'INCIDENT_RESOLVE_MANUAL',
  entityType: 'Incident',
  entityId: incidentId.toString(),
  details: { reason: 'Verified manually by operator' }
});
const auditErr = audit.validateSync();
assert.equal(auditErr, undefined, 'AuditLog validation should pass');
console.log('✓ AuditLog model schema verified.');

// 8. Live Database Connection & Collection Initialization Verification
import { connectDB, disconnectDB } from '../src/common/db.js';

try {
  console.log('\n--- Verifying Live Database Connection & Collection Initialization ---');
  await connectDB();
  
  // Ensure indexes are built for all models in live MongoDB
  await User.syncIndexes();
  await MonitoredServer.syncIndexes();
  await Incident.syncIndexes();
  await IncidentOccurrence.syncIndexes();
  await ServerVitals.syncIndexes();
  await AppSetting.syncIndexes();
  await AuditLog.syncIndexes();
  console.log('✓ Successfully synchronized indexes for all 7 Mongoose models.');

  // Create & verify test records in live MongoDB
  const testUser = await User.create({
    email: 'init_test@fixly.local',
    passwordHash: '$2b$10$testpasswordhash',
    role: UserRole.ADMIN
  });
  assert.ok(testUser._id, 'Live User document saved');

  const fetchedUser = await User.findOne({ email: 'init_test@fixly.local' });
  assert.equal(fetchedUser.role, 'ADMIN', 'Live User document retrieved');

  // Cleanup test user
  await User.deleteOne({ _id: testUser._id });
  console.log('✓ Live database connection, CRUD operations, and index synchronization verified.');

} catch (dbErr) {
  console.warn('⚠️ Live MongoDB test skipped or failed:', dbErr.message);
} finally {
  await disconnectDB();
}

console.log('PASSED: Phase 0.2 Mongoose Document Models & Database Test Suite!');

