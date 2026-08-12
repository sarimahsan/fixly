/**
 * Fixly Shared Constants, Enums, Error Models, and Interface Helpers
 */

// User Roles
export const UserRole = Object.freeze({
  ADMIN: 'ADMIN',
  READ_ONLY: 'READ_ONLY',
  OPERATOR: 'OPERATOR'
});

// Monitored Server Statuses
export const ServerStatus = Object.freeze({
  CONNECTED: 'CONNECTED',
  DISCONNECTED: 'DISCONNECTED',
  ERROR: 'ERROR'
});

// Incident Lifecycle Statuses
export const IncidentStatus = Object.freeze({
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  IGNORED: 'IGNORED'
});

// Incident Severities
export const IncidentSeverity = Object.freeze({
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
});

// Resolution Agent Types
export const ResolverType = Object.freeze({
  AI: 'AI',
  HUMAN: 'HUMAN'
});

// Code Fix Proposal Statuses
export const CodeFixStatus = Object.freeze({
  PENDING: 'PENDING',
  APPLIED: 'APPLIED',
  REJECTED: 'REJECTED',
  VERIFIED: 'VERIFIED'
});

// WebSocket Event Channels & Types
export const WSEventType = Object.freeze({
  INCIDENT_CREATED: 'incident:created',
  INCIDENT_UPDATED: 'incident:updated',
  VITALS_UPDATED: 'vitals:updated',
  DIAGNOSIS_CREATED: 'diagnosis:created',
  FIX_PROPOSED: 'fix:proposed',
  INCIDENT_RESOLVED: 'incident:resolved'
});

/**
 * Base Application Error
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access', details = null) {
    super(message, 401, 'UNAUTHORIZED', details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden access', details = null) {
    super(message, 403, 'FORBIDDEN', details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details = null) {
    super(message, 404, 'NOT_FOUND', details);
  }
}

export class ConflictError extends AppError {
  constructor(message, details = null) {
    super(message, 409, 'CONFLICT', details);
  }
}

export class SSHConnectionError extends AppError {
  constructor(message = 'Failed to connect via SSH', details = null) {
    super(message, 500, 'SSH_CONNECTION_ERROR', details);
  }
}

export class AIDiagnosisError extends AppError {
  constructor(message = 'AI diagnosis execution failed', details = null) {
    super(message, 500, 'AI_DIAGNOSIS_ERROR', details);
  }
}

/**
 * WebSocket Payload Constructor Helper
 */
export function createWSPayload(event, payload) {
  const validEvents = Object.values(WSEventType);
  if (!validEvents.includes(event)) {
    throw new ValidationError(`Invalid WebSocket event type: ${event}`);
  }
  return {
    event,
    payload,
    timestamp: new Date().toISOString()
  };
}

/**
 * Server Vitals Validator Helper
 */
export function validateServerVitals(vitals) {
  const { cpuUsagePercent, memoryUsagePercent, diskUsagePercent } = vitals || {};
  if (
    typeof cpuUsagePercent !== 'number' || cpuUsagePercent < 0 || cpuUsagePercent > 100 ||
    typeof memoryUsagePercent !== 'number' || memoryUsagePercent < 0 || memoryUsagePercent > 100 ||
    typeof diskUsagePercent !== 'number' || diskUsagePercent < 0 || diskUsagePercent > 100
  ) {
    throw new ValidationError('Server vitals must contain cpuUsagePercent, memoryUsagePercent, and diskUsagePercent as numbers between 0 and 100.');
  }
  return true;
}

export default {
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
};
