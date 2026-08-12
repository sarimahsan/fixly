import crypto from 'node:crypto';
import { Incident } from '../../models/Incident.js';
import { IncidentOccurrence } from '../../models/IncidentOccurrence.js';
import { IncidentSeverity, IncidentStatus, WSEventType } from '../../common/types.js';

export function buildFingerprintSource(errorEvent = {}) {
  return [
    errorEvent.errorType || 'UnknownError',
    errorEvent.normalizedMessage || errorEvent.message || errorEvent.rawLogLine || ''
  ].join('|').toLowerCase().trim();
}

export function fingerprintError(errorEvent = {}) {
  return crypto.createHash('sha256').update(buildFingerprintSource(errorEvent)).digest('hex');
}

function serializeIncident(incident) {
  return {
    id: incident._id?.toString(),
    fingerprint: incident.fingerprint,
    title: incident.title,
    errorType: incident.errorType,
    normalizedMessage: incident.normalizedMessage,
    severity: incident.severity,
    status: incident.status,
    occurrenceCount: incident.occurrenceCount,
    firstSeenAt: incident.firstSeenAt?.toISOString?.() || incident.firstSeenAt,
    lastSeenAt: incident.lastSeenAt?.toISOString?.() || incident.lastSeenAt
  };
}

function serializeIncidentUpdate(incident) {
  return {
    id: incident._id?.toString(),
    occurrenceCount: incident.occurrenceCount,
    lastSeenAt: incident.lastSeenAt?.toISOString?.() || incident.lastSeenAt,
    status: incident.status
  };
}

export class DedupEngine {
  constructor({ broadcaster = null } = {}) {
    this.broadcaster = broadcaster;
  }

  async processError(errorEvent, options = {}) {
    const fingerprint = errorEvent.fingerprint || fingerprintError(errorEvent);
    const now = errorEvent.timestamp ? new Date(errorEvent.timestamp) : new Date();
    const existing = await Incident.findOne({
      fingerprint,
      status: { $ne: IncidentStatus.RESOLVED }
    });

    if (existing) {
      existing.occurrenceCount += 1;
      existing.lastSeenAt = now;
      if (isSeverityHigher(errorEvent.severity, existing.severity)) {
        existing.severity = errorEvent.severity;
      }
      await existing.save();
      await this.recordOccurrence(existing, errorEvent, options.vitalsSnapshot, now);
      const payload = serializeIncidentUpdate(existing);
      this.broadcaster?.broadcast?.(WSEventType.INCIDENT_UPDATED, payload);
      return { action: 'updated', incident: existing, fingerprint, payload };
    }

    const incident = await Incident.create({
      fingerprint,
      title: errorEvent.title || `${errorEvent.errorType || 'UnknownError'}: ${errorEvent.normalizedMessage || errorEvent.rawLogLine}`.slice(0, 180),
      errorType: errorEvent.errorType || 'UnknownError',
      normalizedMessage: errorEvent.normalizedMessage || errorEvent.rawLogLine || '',
      rawStackTrace: errorEvent.rawStackTrace,
      severity: errorEvent.severity || IncidentSeverity.MEDIUM,
      status: IncidentStatus.OPEN,
      occurrenceCount: 1,
      firstSeenAt: now,
      lastSeenAt: now
    });
    await this.recordOccurrence(incident, errorEvent, options.vitalsSnapshot, now);
    const payload = serializeIncident(incident);
    this.broadcaster?.broadcast?.(WSEventType.INCIDENT_CREATED, payload);
    return { action: 'created', incident, fingerprint, payload };
  }

  async recordOccurrence(incident, errorEvent, vitalsSnapshot, timestamp) {
    return IncidentOccurrence.create({
      incidentId: incident._id,
      serverId: errorEvent.serverId,
      rawLogLine: errorEvent.rawLogLine || errorEvent.normalizedMessage || '',
      serverVitalsSnapshot: vitalsSnapshot,
      timestamp
    });
  }
}

export function isSeverityHigher(nextSeverity, currentSeverity) {
  const order = [IncidentSeverity.LOW, IncidentSeverity.MEDIUM, IncidentSeverity.HIGH, IncidentSeverity.CRITICAL];
  return order.indexOf(nextSeverity) > order.indexOf(currentSeverity);
}

export default {
  DedupEngine,
  buildFingerprintSource,
  fingerprintError,
  isSeverityHigher
};
