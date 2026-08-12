import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../../common/config.js';
import { UserModel } from '../../models/User.js';
import { parseJsonBody, sendError } from '../http_utils.js';

export async function signup(req, res) {
  try {
    const body = await parseJsonBody(req);
    const { email, password, fullName } = body;

    if (!email || !password) {
      return sendError(res, { statusCode: 400, message: 'Email and password are required' });
    }

    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      return sendError(res, { statusCode: 409, message: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await UserModel.create({
      email,
      passwordHash,
      fullName: fullName || email.split('@')[0],
      role: 'OPERATOR'
    });

    res.writeHead(201, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ 
      id: newUser.id, 
      email: newUser.email, 
      fullName: newUser.full_name, 
      role: newUser.role 
    }));
  } catch (error) {
    return sendError(res, error);
  }
}

export async function login(req, res) {
  try {
    const body = await parseJsonBody(req);
    const { email, password } = body;

    if (!email || !password) {
      return sendError(res, { statusCode: 400, message: 'Email and password are required' });
    }

    const user = await UserModel.findByEmail(email);
    if (!user) {
      return sendError(res, { statusCode: 401, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return sendError(res, { statusCode: 401, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.jwt.secret,
      { expiresIn: '7d' } // JWT expiry 7d as requested
    );

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role
      }
    }));
  } catch (error) {
    return sendError(res, error);
  }
}

export async function getMe(req, res) {
  try {
    if (!req.user) {
      return sendError(res, { statusCode: 401, message: 'Unauthorized' });
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      id: req.user.id,
      email: req.user.email,
      fullName: req.user.full_name,
      role: req.user.role
    }));
  } catch (error) {
    return sendError(res, error);
  }
}
