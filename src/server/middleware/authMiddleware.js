import jwt from 'jsonwebtoken';
import config from '../../common/config.js';
import { sendError } from '../http_utils.js';
import { UserModel } from '../../models/User.js';

export async function authMiddleware(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const error = new Error('Unauthorized: No token provided');
      error.statusCode = 401;
      throw error;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Check if user still exists
    const user = await UserModel.findById(decoded.id);
    if (!user) {
      const error = new Error('Unauthorized: Invalid token');
      error.statusCode = 401;
      throw error;
    }

    req.user = user;
    return true; // Indicates success
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return sendError(res, { statusCode: 401, message: 'Unauthorized: Token expired' });
    }
    return sendError(res, { statusCode: 401, message: error.message || 'Unauthorized: Invalid token' });
  }
}
