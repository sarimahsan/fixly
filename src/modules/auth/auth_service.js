import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { User } from '../../models/User.js';
import config from '../../common/config.js';
import { UnauthorizedError, ValidationError } from '../../common/types.js';

const pbkdf2 = promisify(crypto.pbkdf2);
const PASSWORD_ALGORITHM = 'pbkdf2-sha512';
const PASSWORD_ITERATIONS = 310_000;
const PASSWORD_KEY_LENGTH = 64;
const JWT_ALGORITHM = 'HS256';

function base64UrlEncode(input) {
  return Buffer.from(input).toString('base64url');
}

function base64UrlDecode(input) {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function parseDurationMs(value) {
  if (typeof value === 'number') return value * 1000;
  const match = String(value || '').trim().match(/^(\d+)([smhd])$/i);
  if (!match) throw new ValidationError(`Invalid JWT expiry duration: ${value}`);
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return amount * multipliers[unit];
}

function timingSafeEqualHex(a, b) {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters long');
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const derived = await pbkdf2(
    password,
    salt,
    PASSWORD_ITERATIONS,
    PASSWORD_KEY_LENGTH,
    'sha512'
  );
  return `${PASSWORD_ALGORITHM}$${PASSWORD_ITERATIONS}$${salt}$${derived.toString('hex')}`;
}

export async function verifyPassword(password, storedHash) {
  if (!password || !storedHash) return false;
  const [algorithm, iterationsRaw, salt, expectedHash] = String(storedHash).split('$');
  if (algorithm !== PASSWORD_ALGORITHM || !iterationsRaw || !salt || !expectedHash) return false;

  const derived = await pbkdf2(
    password,
    salt,
    Number(iterationsRaw),
    Buffer.from(expectedHash, 'hex').length,
    'sha512'
  );
  return timingSafeEqualHex(derived.toString('hex'), expectedHash);
}

export function createJwt(payload, options = {}) {
  const secret = options.secret || config.jwt.secret;
  if (!secret) throw new ValidationError('JWT secret is required');

  const now = Math.floor(Date.now() / 1000);
  const expiresIn = options.expiresIn || config.jwt.expiresIn;
  const exp = now + Math.floor(parseDurationMs(expiresIn) / 1000);
  const header = { alg: JWT_ALGORITHM, typ: 'JWT' };
  const body = { ...payload, iat: now, exp };
  const unsigned = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(body))}`;
  const signature = crypto.createHmac('sha256', secret).update(unsigned).digest('base64url');
  return `${unsigned}.${signature}`;
}

export function verifyJwt(token, options = {}) {
  const secret = options.secret || config.jwt.secret;
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new UnauthorizedError('Invalid authentication token');

  const [encodedHeader, encodedPayload, signature] = parts;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  const validSignature = signature.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!validSignature) throw new UnauthorizedError('Invalid authentication token');

  let header;
  let payload;
  try {
    header = JSON.parse(base64UrlDecode(encodedHeader));
    payload = JSON.parse(base64UrlDecode(encodedPayload));
  } catch {
    throw new UnauthorizedError('Invalid authentication token');
  }

  if (header.alg !== JWT_ALGORITHM) throw new UnauthorizedError('Unsupported token algorithm');

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp <= now) throw new UnauthorizedError('Authentication token expired');
  return payload;
}

export function createSession(user) {
  const id = user._id?.toString?.() || user.id?.toString?.() || user.sub;
  const token = createJwt({ sub: id, email: user.email, role: user.role });
  return {
    token,
    user: { id, email: user.email, role: user.role }
  };
}

export async function authenticateLogin({ email, password }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || !password) throw new UnauthorizedError('Invalid email or password');

  const user = await User.findOne({ email: normalizedEmail });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new UnauthorizedError('Invalid email or password');
  }
  return createSession(user);
}

export function requireAuthenticated(req, _res, next) {
  try {
    const header = req.headers?.authorization || req.headers?.Authorization || '';
    const match = String(header).match(/^Bearer\s+(.+)$/i);
    if (!match) throw new UnauthorizedError('Missing bearer token');
    req.user = verifyJwt(match[1]);
    return next();
  } catch (error) {
    return next(error);
  }
}

export async function loginHandler(req, res, next) {
  try {
    const session = await authenticateLogin(req.body || {});
    return res.status(200).json(session);
  } catch (error) {
    return next(error);
  }
}

export function registerAuthRoutes(app) {
  app.post('/api/auth/login', loginHandler);
  return app;
}

export default {
  hashPassword,
  verifyPassword,
  createJwt,
  verifyJwt,
  createSession,
  authenticateLogin,
  requireAuthenticated,
  loginHandler,
  registerAuthRoutes
};
