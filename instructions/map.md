# Fixly — Agent Build Instructions

This file tells your AI coding agent exactly what to build. Each team member uses this same file — the agent should only do the work listed under **your** user number. Do not build other members' sections; that work is being done in parallel by someone else.

Tell your agent at the start of the session: *"I am User [1/2/3/4]. Only do the work listed under my section in this file. Do not touch other sections."*

---

## Shared Context (all agents should read this first)

We are building **Fixly**, an AI-powered incident detection and self-healing system. It watches a remote server's logs and resource usage over SSH, groups repeated errors into single tracked incidents, uses AI to diagnose issues and propose code fixes, commits those fixes to Git, and displays everything on a live dashboard with role-based access and a full history/audit trail.

Work is split into 4 phases. Work through your own phases in order. Each phase should be runnable/testable before moving to the next.

### Git Branching & Merging Strategy
- **Phase 0 (Shared Foundation)**: Before feature branches are cut, User 4 builds and pushes shared schemas/types (`src/common/types.js`) and MongoDB Mongoose models (`src/models/`) directly to `main`.
- Each user then branches off `main` to their dedicated feature branch:
  - **User 1**: `user-1/monitoring`
  - **User 2**: `user-2/ai-git`
  - **User 3**: `user-3/ui`
  - **User 4**: `user-4/lead-auth`
- Commit code incrementally to your assigned branch.
- **Do NOT merge feature branches into `main` directly.** All user branches will be merged into `main` at the end after Phase 4.4 End-to-End Verification.

---

## User 1 — Server Connection & Monitoring

**You own:** everything that reads data from the target server. Do not build AI logic, the UI, or auth — other users own those.

### Phase 1.1 — SSH Connection
- Set up a backend module that connects to the target server using key-based SSH authentication.
- Read connection details (host, user, key path) from environment variables.
- Confirm the connection works before building anything on top of it.

### Phase 1.2 — Log Reading
- Continuously read the application's log file on the target server.
- Detect new lines as they're written, and identify which lines are errors.

### Phase 1.3 — Server Vitals
- Pull live memory, disk, and CPU usage from the target server on a regular interval.
- Return this as structured data (not raw command output).

### Phase 1.4 — Error Deduplication
- Fingerprint each detected error (by type + normalized message, stripping timestamps/IDs).
- If the same fingerprint is already an open, unresolved issue, increment its occurrence count instead of creating a new one.
- If it's a new fingerprint, mark it as a new issue.

### Phase 1.5 — Real-Time Streaming
- Emit new issues, occurrence count updates, and vitals updates over a real-time channel (WebSocket) so other parts of the app can consume them live.

**Done when:** triggering the same error repeatedly on the target server results in one issue with a rising counter, not duplicates, and live vitals are visible in raw output/logs.

---

## User 2 — AI Logic & Version Control Integration

**You own:** everything that thinks about and acts on an error. Do not build the SSH/monitoring layer or the UI — other users own those.

### Phase 2.1 — AI Diagnosis
- Build a function that takes an error and its surrounding log context and returns: severity, likely root cause, confidence score, and whether an automated fix exists.
- This should run once per new issue, not once per occurrence.

### Phase 2.2 — AI Code-Fix Proposal
- For a small, known set of error types, map each to a specific file in the connected codebase.
- Build a function that reads that file, sends it plus the error to the AI, and gets back a proposed fix for the specific function/block responsible.
- Do not let the AI touch files outside this known mapping.

### Phase 2.3 — Before/After Diff
- Given the original code and the proposed fix, produce a clear line-by-line comparison of what would change.

### Phase 2.4 — Git Integration
- Connect to the code repository using a stored access token.
- Create a new branch per fix, commit the proposed change to it, and either push directly or open a request for review, depending on configuration.
- Record the resulting commit reference or review link.

### Phase 2.5 — Recovery Verification
- After a fix is applied, monitor for whether the same error fingerprint stops recurring.
- Mark the issue as resolved automatically once confirmed clean for a short window.

**Done when:** a known error type produces a diagnosis, a proposed fix with a before/after comparison, a real commit in the repository, and the issue auto-resolves once the error stops recurring.

---

## User 3 — Interface & User Experience

**You own:** everything the user sees and interacts with. Do not build backend logic, AI calls, or the SSH layer — other users own those and will hand you data in an agreed format.

### Phase 3.1 — Live Dashboard
- Build the main view: a live feed of incoming issues (title, severity, occurrence count, status), updating in real time via WebSocket.
- Add a panel showing live server vitals (memory/disk usage as simple visual indicators).

### Phase 3.2 — Tracked Issues View
- Build a list/board of tracked issues with their current status (Open, In Progress, Resolved).
- Allow status to be changed manually, with an optional notes field, for issues resolved by a person rather than AI.

### Phase 3.3 — History View
- Build a view listing all resolved issues, regardless of how they were resolved.
- Each entry should expand to show either a before/after code comparison (AI-resolved) or resolver notes (human-resolved).

### Phase 3.4 — Settings View
- Build a settings page, visible only to elevated/admin access, for entering and updating the repository access token and related configuration.
- Never display the full token once saved — show a masked version.

### Phase 3.5 — Role-Aware UI
- Hide or disable action buttons (fix actions, status changes, settings) for users without sufficient access, based on the role provided by the auth system.

**Done when:** the dashboard updates live without a refresh, issues can be tracked and manually resolved, history shows both resolution types correctly, and the settings page is only reachable by an elevated role.

---

## User 4 — Demo Environment, Access Control & Coordination (Lead)

**You own:** the environment everything runs against, who can do what, and keeping the other three phases connected. Do not build the monitoring, AI, or UI logic yourself — focus on environment, access, and integration.

### Phase 4.1 — Target Environment
- Set up the target server/application that will be monitored.
- Build in a small, fixed set of reproducible error scenarios (e.g., a button or endpoint that triggers each one on demand).
- Make sure at least two error types map to real, fixable code so User 2's code-fix work has something real to act on.

### Phase 4.2 — Authentication & Roles
- Build login and a small set of access roles (at minimum: elevated/admin and read-only).
- Issue each authenticated session a role that the UI and backend can both check before allowing sensitive actions.

### Phase 4.3 — Integration Checkpoints
- Confirm User 1's output format matches what User 2 expects before User 2 builds against it.
- Confirm User 2's output format matches what User 3 expects before User 3 builds against it.
- Confirm your auth/role output matches what User 3 expects for role-aware UI.

### Phase 4.4 — End-to-End Verification
- Once all parts are connected, personally trigger each error scenario and confirm the full path works: detection → dedup → diagnosis → fix/manual resolution → history.

### Phase 4.5 — Final Walkthrough
- Prepare and rehearse a run-through of the finished system from start to finish.

**Done when:** the target environment reliably produces each error scenario, login/roles work end-to-end, and a full run-through completes without manual patching mid-demo.