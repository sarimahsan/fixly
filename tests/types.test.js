import assert from 'node:assert/strict';
import {
  UserRole,
  ServerStatus,
  IncidentStatus,
  IncidentSeverity,
  ResolverType,
  CodeFixStatus,
  WSEventType,
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  SSHConnectionError,
  AIDiagnosisError,
  createWSPayload,
  validateServerVitals
} from '../src/common/types.js';

console.log('--- Running Phase 0.1 Unit Tests (Shared Types & Errors) ---');

// 1. Verify Constants and Enums
assert.equal(UserRole.ADMIN, 'ADMIN');
assert.equal(UserRole.READ_ONLY, 'READ_ONLY');
assert.equal(UserRole.OPERATOR, 'OPERATOR');

assert.equal(ServerStatus.CONNECTED, 'CONNECTED');
assert.equal(ServerStatus.DISCONNECTED, 'DISCONNECTED');
assert.equal(ServerStatus.ERROR, 'ERROR');

assert.equal(IncidentStatus.OPEN, 'OPEN');
assert.equal(IncidentStatus.IN_PROGRESS, 'IN_PROGRESS');
assert.equal(IncidentStatus.RESOLVED, 'RESOLVED');
assert.equal(IncidentStatus.IGNORED, 'IGNORED');

assert.equal(IncidentSeverity.LOW, 'LOW');
assert.equal(IncidentSeverity.CRITICAL, 'CRITICAL');

assert.equal(ResolverType.AI, 'AI');
assert.equal(ResolverType.HUMAN, 'HUMAN');

assert.equal(CodeFixStatus.PENDING, 'PENDING');
assert.equal(CodeFixStatus.VERIFIED, 'VERIFIED');

assert.equal(WSEventType.INCIDENT_CREATED, 'incident:created');
assert.equal(WSEventType.VITALS_UPDATED, 'vitals:updated');
console.log('✓ Enums & Constants verified successfully.');

// 2. Verify Custom Error Class Hierarchy
const baseErr = new AppError('Base error', 500, 'BASE_ERR');
assert.ok(baseErr instanceof Error);
assert.ok(baseErr instanceof AppError);
assert.equal(baseErr.statusCode, 500);

const valErr = new ValidationError('Invalid email format', { field: 'email' });
assert.ok(valErr instanceof AppError);
assert.equal(valErr.statusCode, 400);
assert.equal(valErr.code, 'VALIDATION_ERROR');
assert.equal(valErr.details.field, 'email');

const unauthErr = new UnauthorizedError();
assert.equal(unauthErr.statusCode, 401);

const forbiddenErr = new ForbiddenError();
assert.equal(forbiddenErr.statusCode, 403);

const notFoundErr = new NotFoundError();
assert.equal(notFoundErr.statusCode, 404);

const conflictErr = new ConflictError('User already exists');
assert.equal(conflictErr.statusCode, 409);

const sshErr = new SSHConnectionError('Connection timed out');
assert.equal(sshErr.statusCode, 500);
assert.equal(sshErr.code, 'SSH_CONNECTION_ERROR');

const aiErr = new AIDiagnosisError('Model output parsing failed');
assert.equal(aiErr.statusCode, 500);
assert.equal(aiErr.code, 'AI_DIAGNOSIS_ERROR');
console.log('✓ Custom Error Models verified successfully.');

// 3. Verify WebSocket Payload Builder
const payload = createWSPayload(WSEventType.INCIDENT_CREATED, { id: 'inc-123', title: 'DB Error' });
assert.equal(payload.event, 'incident:created');
assert.equal(payload.payload.id, 'inc-123');
assert.ok(payload.timestamp);

assert.throws(() => {
  createWSPayload('invalid:event', {});
}, ValidationError);
console.log('✓ WebSocket Payload Creator verified successfully.');

// 4. Verify Vitals Validator
assert.equal(validateServerVitals({ cpuUsagePercent: 55, memoryUsagePercent: 80, diskUsagePercent: 30 }), true);

assert.throws(() => {
  validateServerVitals({ cpuUsagePercent: 105, memoryUsagePercent: 50, diskUsagePercent: 50 });
}, ValidationError);

assert.throws(() => {
  validateServerVitals({ cpuUsagePercent: -5, memoryUsagePercent: 50, diskUsagePercent: 50 });
}, ValidationError);

console.log('✓ Server Vitals Validator verified successfully.');
console.log('PASSED: Phase 0.1 Shared Types & Errors Unit Test Suite!');
