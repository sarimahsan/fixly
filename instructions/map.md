# Fixly — Master Sequential Execution Roadmap

This file defines the step-by-step sequential build plan for **Fixly**. All development is conducted linearly on the `main` git branch, phase by phase.

---

## System Context

We are building **Fixly**, an AI-powered incident detection and self-healing system. It watches a remote server's logs and resource usage over SSH, groups repeated errors into single tracked incidents, uses AI to diagnose issues and propose code fixes, commits those fixes to Git, and displays everything on a live dashboard with role-based access and a full history/audit trail.

### Development Workflow & Git Strategy
- **Single Branch (`main`)**: All changes are committed directly to `main` upon completing and verifying each sub-phase.
- **Sequential Order**: Work through phases in order from Phase 0 to Phase 5. Each phase must be tested and runnable before moving to the next.

---

## Phase 0 — Foundation & Shared Contracts

### Phase 0.1 — Shared Types & Constants
- Build `src/common/types.js` defining all shared interfaces, error models, vitals formats, and WebSocket message schemas.
- Ensure logger and configuration utilities are initialized.

### Phase 0.2 — Database Schemas & Models
- Build Mongoose document models in `src/models/` (`User`, `MonitoredServer`, `Incident`, `IncidentOccurrence`, `ServerVitals`, `AppSetting`, `AuditLog`).

---

## Phase 1 — Authentication, Roles & Settings API

### Phase 1.1 — Authentication & Session Management
- Build backend authentication (`src/modules/auth/auth_service.js`) with password hashing and JWT sessions.

### Phase 1.2 — Role-Based Access Control (RBAC)
- Implement RBAC middleware (`src/modules/auth/rbac_middleware.js`) with `admin` and `viewer` roles.

### Phase 1.3 — Server & Repository Settings API
- Implement Backend Settings API (`GET /api/settings`, `PUT /api/settings`) in `src/modules/auth/settings_service.js` with encrypted token storage.

---

## Phase 2 — Server Connection & Monitoring

### Phase 2.1 — SSH Connection
- Implement key-based SSH connection using `node-ssh` in `src/modules/monitoring/ssh_client.js`.
- Read connection credentials from environment variables / DB settings.

### Phase 2.2 — Log Reading & Parsing
- Implement continuous log stream reader in `src/modules/monitoring/log_reader.js`.
- Parse log entries in real-time and filter error events.

### Phase 2.3 — Server Vitals Monitor
- Implement periodic resource parser in `src/modules/monitoring/vitals_reader.js` (CPU, Memory, Disk usage).

### Phase 2.4 — SHA-256 Error Deduplication
- Implement fingerprinting in `src/modules/monitoring/dedup_engine.js`.
- Increment occurrence counters for existing open incidents; create new entries for novel fingerprints.

### Phase 2.5 — Real-Time WebSocket Streaming
- Implement `src/modules/monitoring/ws_broadcaster.js` to broadcast vitals, incident creations, and occurrence updates live over WebSockets.

---

## Phase 3 — AI Logic & Version Control Integration

### Phase 3.1 — AI Diagnosis Engine
- Implement `src/modules/ai/diagnosis.js` to diagnose root cause, assign severity, and calculate confidence score.

### Phase 3.2 — AI Code-Fix Proposal Generator
- Implement `src/modules/ai/code_fixer.js` to inspect affected codebase files and propose code patches.

### Phase 3.3 — Line-by-Line Diff Generator
- Implement `src/modules/ai/diff_generator.js` to generate unified line-by-line diffs for UI rendering.

### Phase 3.4 — Git Integration & PR Automation
- Implement `src/modules/git/git_client.js` using `simple-git` to branch, commit proposed fixes, and create GitHub PRs or push commits.

### Phase 3.5 — Auto-Recovery Verification
- Implement `src/modules/git/recovery.js` to monitor log streams post-fix and auto-resolve incidents when errors cease.

---

## Phase 4 — Frontend UI & User Experience

### Phase 4.1 — Live Incident Feed & Vitals Dashboard
- Implement React + Vite dashboard in `src/client/` with live WebSocket feed and server vitals widgets.

### Phase 4.2 — Tracked Issues Board & Manual Resolution
- Implement issues management board with status lifecycle (`Open`, `In Progress`, `Resolved`) and manual resolution modals.

### Phase 4.3 — Incident History & Code Diff Viewer
- Implement history list showing resolution audit trails and visual code diff comparison modals.

### Phase 4.4 — Masked Settings & Access Control UI
- Implement settings view with masked GitHub tokens and RBAC button/action visibility guards.

---

## Phase 5 — Integration & Final Verification

### Phase 5.1 — End-to-End System Test
- Trigger error scenarios on remote monitored server over SSH and verify complete flow: Log Detection → Fingerprint Dedup → AI Diagnosis → Git Patch → Live UI Update → Auto-Recovery.

### Phase 5.2 — Final Rehearsal & Documentation Walkthrough
- Confirm zero console errors, clean test suite execution, and verify all documentation.