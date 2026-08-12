import { ForbiddenError, UnauthorizedError, UserRole } from '../../common/types.js';

export const AccessRole = Object.freeze({
  ADMIN: 'admin',
  VIEWER: 'viewer'
});

const ADMIN_ROLES = new Set([UserRole.ADMIN]);
const VIEWER_ROLES = new Set([UserRole.ADMIN, UserRole.OPERATOR, UserRole.READ_ONLY]);

export function canAccess(userRole, requiredAccess = AccessRole.VIEWER) {
  if (requiredAccess === AccessRole.ADMIN) return ADMIN_ROLES.has(userRole);
  if (requiredAccess === AccessRole.VIEWER) return VIEWER_ROLES.has(userRole);
  return false;
}

export function requireRole(requiredAccess = AccessRole.VIEWER) {
  return function roleMiddleware(req, _res, next) {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      if (!canAccess(req.user.role, requiredAccess)) {
        throw new ForbiddenError(`${requiredAccess} access required`);
      }
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

export const requireAdmin = requireRole(AccessRole.ADMIN);
export const requireViewer = requireRole(AccessRole.VIEWER);

export default {
  AccessRole,
  canAccess,
  requireRole,
  requireAdmin,
  requireViewer
};
