import { AppError, NotFoundError } from '../common/types.js';

export async function parseJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  return JSON.parse(raw);
}

export function createResponseAdapter(res) {
  return {
    status(code) {
      res.statusCode = code;
      return this;
    },
    json(payload) {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(payload));
    }
  };
}

export function sendError(res, error) {
  if (res.writableEnded) return;
  const normalized = error instanceof AppError
    ? error
    : new AppError(error.message || 'Internal server error');
  res.statusCode = normalized.statusCode;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify({ error: normalized.code, message: normalized.message }));
}

export async function runHandlers(req, res, handlers) {
  const response = createResponseAdapter(res);
  let index = 0;

  const next = async (error) => {
    if (error) return sendError(res, error);
    const handler = handlers[index++];
    if (!handler || res.writableEnded) return;
    await Promise.resolve(handler(req, response, next)).catch(next);
  };

  await next();
}

export function routeNotFound(res) {
  sendError(res, new NotFoundError('Route not found'));
}
