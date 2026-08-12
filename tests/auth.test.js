import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, createJwt, verifyJwt, createSession } from '../src/modules/auth/auth_service.js';
import { UserRole, UnauthorizedError, ValidationError } from '../src/common/types.js';

console.log('--- Running Phase 1.1 Unit Tests (Auth Service) ---');

const password = 'super-secret-password';
const passwordHash = await hashPassword(password);
assert.ok(passwordHash.startsWith('pbkdf2-sha512$310000$'));
assert.notEqual(passwordHash, password);
assert.equal(await verifyPassword(password, passwordHash), true);
assert.equal(await verifyPassword('wrong-password', passwordHash), false);
await assert.rejects(() => hashPassword('short'), ValidationError);
console.log('✓ Password hashing and verification verified.');

const token = createJwt(
  { sub: 'user-123', email: 'admin@fixly.local', role: UserRole.ADMIN },
  { secret: 'test-secret', expiresIn: '1h' }
);
const payload = verifyJwt(token, { secret: 'test-secret' });
assert.equal(payload.sub, 'user-123');
assert.equal(payload.email, 'admin@fixly.local');
assert.equal(payload.role, UserRole.ADMIN);
assert.ok(payload.iat);
assert.ok(payload.exp > payload.iat);
assert.throws(() => verifyJwt(`${token.slice(0, -4)}oops`, { secret: 'test-secret' }), UnauthorizedError);
assert.throws(() => createJwt({ sub: '1' }, { secret: 'test-secret', expiresIn: 'bad' }), ValidationError);
console.log('✓ JWT creation, verification, and tamper rejection verified.');

const session = createSession({ _id: '507f1f77bcf86cd799439011', email: 'viewer@fixly.local', role: UserRole.READ_ONLY });
assert.ok(session.token);
assert.deepEqual(session.user, {
  id: '507f1f77bcf86cd799439011',
  email: 'viewer@fixly.local',
  role: UserRole.READ_ONLY
});
console.log('✓ Session response contract verified.');

console.log('PASSED: Phase 1.1 Auth Service Test Suite!');
