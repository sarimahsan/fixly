import { EventEmitter } from 'node:events';
import { IncidentStatus, ResolverType, WSEventType } from '../../common/types.js';

export function containsIncidentFingerprint(logEvent, incident) {
  const text = [
    logEvent?.fingerprint,
    logEvent?.errorType,
    logEvent?.normalizedMessage,
    logEvent?.message,
    logEvent?.rawLine
  ].filter(Boolean).join('\n');
  return Boolean(
    (incident?.fingerprint && text.includes(incident.fingerprint)) ||
    (incident?.errorType && text.includes(incident.errorType)) ||
    (incident?.normalizedMessage && text.includes(incident.normalizedMessage))
  );
}

export async function resolveIncident(incident, { broadcaster = null, notes = null } = {}) {
  const resolvedAt = new Date();
  incident.status = IncidentStatus.RESOLVED;
  incident.resolvedAt = resolvedAt;
  incident.resolvedByType = ResolverType.AI;
  incident.resolutionNotes = notes || 'Automated verification confirmed no matching errors during the recovery window.';
  if (incident.fixProposal) {
    incident.fixProposal.status = 'VERIFIED';
    incident.fixProposal.appliedAt = incident.fixProposal.appliedAt || resolvedAt;
  }
  if (typeof incident.save === 'function') await incident.save();

  const payload = {
    incidentId: String(incident._id || incident.id || incident.fingerprint),
    status: IncidentStatus.RESOLVED,
    resolvedAt: resolvedAt.toISOString(),
    resolvedByType: ResolverType.AI,
    resolvedByUserId: null,
    resolutionNotes: incident.resolutionNotes
  };
  broadcaster?.broadcast?.(WSEventType.INCIDENT_RESOLVED, payload);
  return payload;
}

export async function verifyRecovery(incident, {
  events = [],
  windowMs = 5 * 60 * 1000,
  now = new Date(),
  broadcaster = null,
  persist = true
} = {}) {
  const windowStart = new Date(now.getTime() - windowMs);
  const recentMatches = events.filter((event) => {
    const timestamp = event.timestamp ? new Date(event.timestamp) : now;
    return timestamp >= windowStart && containsIncidentFingerprint(event, incident);
  });

  if (recentMatches.length > 0) {
    return { resolved: false, matchingErrorCount: recentMatches.length, checkedAt: now.toISOString() };
  }

  let payload = null;
  if (persist) {
    payload = await resolveIncident(incident, {
      broadcaster,
      notes: `Automated verification confirmed 0 occurrences detected during ${Math.round(windowMs / 1000)} second recovery window.`
    });
  }
  return { resolved: true, matchingErrorCount: 0, checkedAt: now.toISOString(), payload, persisted: persist };
}

export class RecoveryMonitor extends EventEmitter {
  constructor({ incident, logReader = null, broadcaster = null, windowMs = 5 * 60 * 1000, clock = () => new Date() } = {}) {
    super();
    this.incident = incident;
    this.logReader = logReader;
    this.broadcaster = broadcaster;
    this.windowMs = windowMs;
    this.clock = clock;
    this.events = [];
    this.boundHandler = (event) => this.record(event);
  }

  start() {
    this.logReader?.on?.('error-log', this.boundHandler);
    return this;
  }

  stop() {
    if (typeof this.logReader?.off === 'function') {
      this.logReader.off('error-log', this.boundHandler);
    } else {
      this.logReader?.removeListener?.('error-log', this.boundHandler);
    }
    return this;
  }

  record(event) {
    this.events.push({ ...event, timestamp: event.timestamp || this.clock().toISOString() });
    const cutoff = this.clock().getTime() - this.windowMs;
    this.events = this.events.filter((item) => new Date(item.timestamp).getTime() >= cutoff);
    this.emit('recorded', event);
  }

  async check() {
    const result = await verifyRecovery(this.incident, {
      events: this.events,
      windowMs: this.windowMs,
      now: this.clock(),
      broadcaster: this.broadcaster
    });
    if (result.resolved) this.emit('resolved', result.payload);
    return result;
  }
}

export default {
  RecoveryMonitor,
  containsIncidentFingerprint,
  resolveIncident,
  verifyRecovery
};
