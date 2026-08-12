import { signup, login, getMe } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { routeNotFound } from '../http_utils.js';

export async function handleAuthRoutes(req, res, pathname) {
  const method = req.method;

  if (method === 'POST' && pathname === '/api/auth/signup') {
    return signup(req, res);
  }

  if (method === 'POST' && pathname === '/api/auth/login') {
    return login(req, res);
  }

  if (method === 'GET' && pathname === '/api/auth/me') {
    try {
      await authMiddleware(req, res);
      return getMe(req, res);
    } catch (err) {
      // authMiddleware handles the response on failure
      return;
    }
  }

  return routeNotFound(res);
}
