import crypto from 'node:crypto';
import { AIDiagnosisError, IncidentSeverity, WSEventType } from '../../common/types.js';

const SEVERITY_RANK = {
  [IncidentSeverity.LOW]: 1,
  [IncidentSeverity.MEDIUM]: 2,
  [IncidentSeverity.HIGH]: 3,
  [IncidentSeverity.CRITICAL]: 4
};

const RULES = [
  {
    test: /connection|timeout|econnrefused|database|pool/i,
    severity: IncidentSeverity.HIGH,
    rootCause: 'The incident points to an upstream connectivity or database resource exhaustion path. Check timeout handling, pool limits, and retry behavior around the failing call site.',
    automatableFixExists: true,
    confidence: 0.86
  },
  {
    test: /typeerror|cannot read|undefined|null/i,
    severity: IncidentSeverity.MEDIUM,
    rootCause: 'The stack trace indicates unsafe access to a nullable or unexpected value. Add input validation or optional guards before the failing operation.',
    automatableFixExists: true,
    confidence: 0.82
  },
  {
    test: /syntaxerror|parse|unexpected token/i,
    severity: IncidentSeverity.HIGH,
    rootCause: 'The failing process is attempting to parse malformed code or payload data. Validate parser inputs and correct the malformed source or response handling.',
    automatableFixExists: true,
    confidence: 0.8
  },
  {
    test: /permission|eacces|forbidden|unauthori[sz]ed/i,
    severity: IncidentSeverity.HIGH,
    rootCause: 'The incident is caused by insufficient permissions or invalid credentials in the failing execution path.',
    automatableFixExists: false,
    confidence: 0.78
  },
  {
    test: /memory|heap|oom/i,
    severity: IncidentSeverity.CRITICAL,
    rootCause: 'The service appears to be exhausting memory. Investigate unbounded allocations, large payload handling, or missing stream/backpressure controls.',
    automatableFixExists: false,
    confidence: 0.84
  }
];

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function incidentText(incident) {
  return [
    incident?.title,
    incident?.errorType,
    incident?.normalizedMessage,
    incident?.rawStackTrace,
    incident?.message
  ].filter(Boolean).join('\n');
}

function normalizeIncidentId(incident) {
  return String(incident?._id || incident?.id || incident?.incidentId || incident?.fingerprint || 'unknown');
}

function pickWorstSeverity(ruleSeverity, incidentSeverity) {
  if (!incidentSeverity) return ruleSeverity;
  return SEVERITY_RANK[incidentSeverity] > SEVERITY_RANK[ruleSeverity] ? incidentSeverity : ruleSeverity;
}

export function diagnoseWithRules(incident) {
  const text = incidentText(incident);
  const match = RULES.find((rule) => rule.test.test(text));
  const occurrenceBoost = Math.min(Number(incident?.occurrenceCount || 1) / 100, 0.08);
  const base = match || {
    severity: incident?.severity || IncidentSeverity.MEDIUM,
    rootCause: 'No precise known failure signature matched. Review the recent stack trace, deployment changes, and the code path referenced by the incident.',
    automatableFixExists: false,
    confidence: 0.55
  };

  return {
    severity: pickWorstSeverity(base.severity, incident?.severity),
    rootCause: base.rootCause,
    confidenceScore: clamp(base.confidence + occurrenceBoost),
    automatableFixExists: Boolean(base.automatableFixExists),
    metadata: {
      strategy: 'rules',
      analyzedTextHash: crypto.createHash('sha256').update(text).digest('hex'),
      matchedRule: match ? match.test.toString() : 'fallback'
    },
    createdAt: new Date()
  };
}

export async function diagnoseIncident(incident, { aiClient = null, broadcaster = null, persist = false } = {}) {
  if (!incident) throw new AIDiagnosisError('Cannot diagnose an empty incident.');

  let diagnosis;
  if (aiClient?.diagnose) {
    diagnosis = await aiClient.diagnose(incident);
    diagnosis.metadata = { ...(diagnosis.metadata || {}), strategy: 'ai-client' };
  } else {
    diagnosis = diagnoseWithRules(incident);
  }

  diagnosis.confidenceScore = clamp(Number(diagnosis.confidenceScore));
  diagnosis.automatableFixExists = Boolean(diagnosis.automatableFixExists);

  if (persist && typeof incident.save === 'function') {
    incident.diagnosis = diagnosis;
    incident.severity = diagnosis.severity;
    await incident.save();
  }

  const incidentId = normalizeIncidentId(incident);
  const diagnosisId = crypto.createHash('sha1').update(`${incidentId}:${diagnosis.createdAt?.toISOString?.() || Date.now()}`).digest('hex').slice(0, 16);
  const payload = {
    incidentId,
    diagnosisId,
    severity: diagnosis.severity,
    rootCause: diagnosis.rootCause,
    confidenceScore: diagnosis.confidenceScore,
    automatableFixExists: diagnosis.automatableFixExists
  };
  broadcaster?.broadcast?.(WSEventType.DIAGNOSIS_CREATED, payload);

  return { ...diagnosis, diagnosisId, payload };
}

export default {
  diagnoseIncident,
  diagnoseWithRules
};
