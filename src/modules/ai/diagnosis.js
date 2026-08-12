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
    incident?.message,
    incident?.rawLogLine
  ].filter(Boolean).join('\n');
}

function normalizeIncidentId(incident) {
  return String(incident?._id || incident?.id || incident?.incidentId || incident?.fingerprint || 'unknown');
}

function pickWorstSeverity(ruleSeverity, incidentSeverity) {
  if (!incidentSeverity) return ruleSeverity;
  return SEVERITY_RANK[incidentSeverity] > SEVERITY_RANK[ruleSeverity] ? incidentSeverity : ruleSeverity;
}

async function callGroqAI(incident) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.startsWith('ghp_')) return null;

  try {
    const promptText = `Log Line: ${incident.rawLogLine || incident.title}\nNormalized Message: ${incident.normalizedMessage || ''}`;
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are Fixly AI Senior Systems Engineer. Analyze the incident log and return JSON with keys: rootCause (string), severity (LOW, MEDIUM, HIGH, or CRITICAL), confidenceScore (number 0 to 1), automatableFixExists (boolean).',
          },
          { role: 'user', content: promptText },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const content = JSON.parse(data.choices[0].message.content);
      return {
        severity: content.severity || IncidentSeverity.HIGH,
        rootCause: content.rootCause || 'Root cause identified by Groq Llama 3.3 model.',
        confidenceScore: clamp(Number(content.confidenceScore || 0.94)),
        automatableFixExists: content.automatableFixExists !== false,
        metadata: { strategy: 'groq-llama-3.3-70b', model: 'llama-3.3-70b-versatile' },
        createdAt: new Date(),
      };
    }
  } catch {
    // Fall back gracefully to rule engine if API fails
  }
  return null;
}

export function diagnoseWithRules(incident) {
  const text = incidentText(incident);
  const match = RULES.find((rule) => rule.test.test(text));
  const occurrenceBoost = Math.min(Number(incident?.occurrenceCount || 1) / 100, 0.08);
  const base = match || {
    severity: incident?.severity || IncidentSeverity.MEDIUM,
    rootCause: 'No precise known failure signature matched. Review recent stack trace and deployment changes.',
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

  let diagnosis = null;
  if (process.env.GROQ_API_KEY) {
    diagnosis = await callGroqAI(incident);
  }
  if (!diagnosis && aiClient?.diagnose) {
    diagnosis = await aiClient.diagnose(incident);
  }
  if (!diagnosis) {
    diagnosis = diagnoseWithRules(incident);
  }

  diagnosis.confidenceScore = clamp(Number(diagnosis.confidenceScore));
  diagnosis.automatableFixExists = Boolean(diagnosis.automatableFixExists);

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
