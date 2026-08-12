import assert from 'node:assert/strict';
import { canAccess, requireAdmin, requireViewer } from '../src/modules/auth/rbac_middleware.js';
import { UserRole, ForbiddenError, UnauthorizedError } from '../src/common/types.js';

console.log('--- Running Phase 1.2 Unit Tests (RBAC Middleware) ---');

assert.equal(canAccess(UserRole.ADMIN, 'admin'), true);
assert.equal(canAccess(UserRole.OPERATOR, 'admin'), false);
assert.equal(canAccess(UserRole.READ_ONLY, 'admin'), false);
assert.equal(canAccess(UserRole.ADMIN, 'viewer'), true);
assert.equal(canAccess(UserRole.OPERATOR, 'viewer'), true);
assert.equal(canAccess(UserRole.READ_ONLY, 'viewer'), true);
assert.equal(canAccess('UNKNOWN', 'viewer'), false);
console.log('✓ Admin vs viewer access matrix verified.');

function runMiddleware(middleware, user) {
  return new Promise((resolve) => {
    middleware({ user }, {}, (error) => resolve(error || null));
  });
}

assert.equal(await runMiddleware(requireAdmin, { role: UserRole.ADMIN }), null);
assert.ok(await runMiddleware(requireAdmin, { role: UserRole.READ_ONLY }) instanceof ForbiddenError);
assert.equal(await runMiddleware(requireViewer, { role: UserRole.OPERATOR }), null);
assert.ok(await runMiddleware(requireViewer, null) instanceof UnauthorizedError);
console.log('✓ RBAC middleware next/error behavior verified.');

console.log('PASSED: Phase 1.2 RBAC Middleware Test Suite!');
