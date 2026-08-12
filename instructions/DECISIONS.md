# Fixly — System Decisions & Cross-Module Data Contracts

This document records the architectural contracts between module boundaries to enable parallel agentic development without integration conflicts.

---

## 1. Real-Time WebSocket Events Matrix

Broadcasted over `/ws` channel by **User 1 (Monitoring)** and **User 2 (AI/Git)**, consumed by **User 3 (UI Dashboard)**.

### Event: `incident:created`
Emitted by **User 1** when a new error fingerprint is detected.

```json
{
  "event": "incident:created",
  "payload": {
    "id": "inc-uuid-1234",
    "fingerprint": "a1b2c3d4e5...",
    "title": "UnhandledPromiseRejectionError: Connection Timeout",
    "errorType": "UnhandledPromiseRejectionError",
    "normalizedMessage": "Connection Timeout at Database.connect",
    "severity": "HIGH",
    "status": "OPEN",
    "occurrenceCount": 1,
    "firstSeenAt": "2026-08-11T20:00:00.000Z",
    "lastSeenAt": "2026-08-11T20:00:00.000Z"
  }
}
```

### Event: `incident:updated`
Emitted by **User 1** when occurrence count increments or by **User 2 / User 3** when status changes.

```json
{
  "event": "incident:updated",
  "payload": {
    "id": "inc-uuid-1234",
    "occurrenceCount": 42,
    "lastSeenAt": "2026-08-11T20:05:12.000Z",
    "status": "IN_PROGRESS"
  }
}
```

### Event: `vitals:updated`
Emitted by **User 1** every 5 seconds.

```json
{
  "event": "vitals:updated",
  "payload": {
    "serverId": "srv-uuid-5678",
    "cpuUsagePercent": 34.2,
    "memoryUsagePercent": 68.5,
    "diskUsagePercent": 42.0,
    "timestamp": "2026-08-11T20:05:15.000Z"
  }
}
```

### Event: `diagnosis:created`
Emitted by **User 2** after AI analysis finishes.

```json
{
  "event": "diagnosis:created",
  "payload": {
    "incidentId": "inc-uuid-1234",
    "diagnosisId": "diag-uuid-9999",
    "severity": "HIGH",
    "rootCause": "Database connection pool exhausted due to unclosed client connections in heavy load loop.",
    "confidenceScore": 0.94,
    "automatableFixExists": true
  }
}
```

### Event: `fix:proposed`
Emitted by **User 2** when a git branch and code patch are ready.

```json
{
  "event": "fix:proposed",
  "payload": {
    "incidentId": "inc-uuid-1234",
    "proposalId": "prop-uuid-7777",
    "targetFilePath": "src/target_environment/app/faulty_routes.js",
    "gitBranchName": "fix/inc-1234-db-timeout",
    "pullRequestUrl": "https://github.com/org/repo/pull/42",
    "diffPatch": "--- a/src/target_environment/app/faulty_routes.js\n+++ b/src/target_environment/app/faulty_routes.js\n@@ -10,3 +10,3 @@\n-  db.connect();\n+  await db.connectWithTimeout(5000);\n"
  }
}
```

### Event: `incident:resolved`
Emitted by **User 2** (when auto-recovery verification passes) or **User 4 / REST API** (when human manual resolution is triggered).

```json
{
  "event": "incident:resolved",
  "payload": {
    "incidentId": "inc-uuid-1234",
    "status": "RESOLVED",
    "resolvedAt": "2026-08-11T20:10:00.000Z",
    "resolvedByType": "AI",
    "resolvedByUserId": null,
    "resolutionNotes": "Automated verification confirmed 0 occurrences detected during 5-minute recovery window."
  }
}
```

---

## 2. REST API Contracts

*Backend API implementation owned by **User 4 (Lead & Auth)**; UI consumption owned by **User 3**.*

### Auth Endpoints (User 4 Backend API)
- `POST /api/auth/login`
  - **Request**: `{ "email": "user@fixly.local", "password": "secret" }`
  - **Response**: `{ "token": "jwt-token-string", "user": { "id": "...", "email": "...", "role": "ADMIN" } }`

### Incidents Endpoints (User 4 Backend API, consumed by User 3 UI)
- `GET /api/incidents` -> Returns paginated list of incidents (`status`, `severity`).
- `GET /api/incidents/:id` -> Returns incident details, diagnosis, proposals, and occurrences log.
- `PATCH /api/incidents/:id/resolve` -> Resolves incident (`resolvedByType: 'HUMAN'`, `resolutionNotes`). Also triggers `incident:resolved` WebSocket broadcast.

### Settings Endpoints (User 4 Backend API, consumed by User 3 UI)
- `GET /api/settings` -> Returns masked settings (e.g. `{ "GIT_ACCESS_TOKEN": "ghp_****1234", "AI_PROVIDER": "GROQ" }`).
- `PUT /api/settings` -> Requires `ADMIN` role. Updates encrypted settings.

---

## 3. AI Model & Provider Options (User 2 AI Logic)

Fixly supports plug-and-play AI LLM providers for root-cause diagnosis and unified code diff generation:

1. **Groq LPU Acceleration (Recommended Default)**:
   - **Diagnosis & Code Patch Model**: `llama-3.3-70b-versatile` (70B Meta Llama 3.3, 128k context, high precision patch generation, ~1.4s latency).
   - **Instant Triage Model**: `llama-3.1-8b-instant` (8B Meta Llama 3.1, ultra-low latency < 250ms for initial severity scoring).
   - **API Endpoint**: `https://api.groq.com/openai/v1/chat/completions` (OpenAI-compatible REST API / `groq` SDK).
2. **Anthropic Claude**:
   - **Model**: `claude-3-5-sonnet` (High context reasoning).
3. **OpenAI**:
   - **Model**: `gpt-4o` / `gpt-4o-mini`.
