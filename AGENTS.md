# Fixly — Agentic Coding Master Instructions & Rules

> **WORKFLOW RULE:**
> Development is executed sequentially on the single `main` branch, step-by-step through the phases defined in `instructions/map.md`. There are no separate user branches or user role prompts.

---

## 1. Core Principles for AI Agents

1. **Sequential Module Execution**:
   - Work through the project phases linearly as outlined in `instructions/map.md`:
     - **Phase 0 (Shared Foundation)**: Types (`src/common/types.js`) and Mongoose models (`src/models/`).
     - **Phase 1 (Auth & Settings API)**: Password hashing & JWT Auth (`src/modules/auth/`), RBAC middleware, Settings API (`GET`/`PUT /api/settings`).
     - **Phase 2 (Monitoring & Transport)**: SSH client, vitals, log parser, deduplication (`src/modules/monitoring/`).
     - **Phase 3 (AI Logic & Git)**: AI diagnosis, patch generator, Git automation (`src/modules/ai/`, `src/modules/git/`).
     - **Phase 4 (UI & UX Dashboard)**: Frontend React app (`src/client/`).
     - **Phase 5 (End-to-End Verification)**: Integration testing against the remote monitored server.
2. **Git Branching Strategy**:
   - All commits are made directly to the `main` branch.
   - Commit incrementally at the completion of each sub-phase.
3. **Contract-Driven Interfaces**:
   - Always rely on shared JavaScript schemas/types in `src/common/types.js` and API/WS payloads in `instructions/DECISIONS.md`.
   - Never change a shared interface or database schema without documenting the change in `instructions/DECISIONS.md`.
4. **Incremental Verification**:
   - Each phase must be tested and verified working before proceeding to the next phase.
   - Run verification commands (`npm test`, manual scripts, build checks) before declaring completion.
5. **No Placeholders or Silent Fallbacks**:
   - Do not swallow errors in empty catch blocks or leave dummy `TODO` comments.
   - Fail fast with explicit logging.

---

## 2. Memory & State Files Map

| File Path | Purpose & Instructions |
| :--- | :--- |
| [map.md](file:///f:/fixly/instructions/map.md) | **Master Roadmap**: Defines phase deliverables in sequential order. |
| [schema.md](file:///f:/fixly/instructions/schema.md) | **DB Schema Reference**: MongoDB Mongoose document models, collections, and subdocuments. |
| [directory_structure.md](file:///f:/fixly/instructions/directory_structure.md) | **Code Tree Reference**: File layout and module domain matrix. |
| [DECISIONS.md](file:///f:/fixly/instructions/DECISIONS.md) | **Shared Contracts**: API payloads, WebSocket event format, data types. |
| [PROGRESS.md](file:///f:/fixly/instructions/PROGRESS.md) | **Live State Tracker**: Log completed phases, blockers, and verification results. |

---

## 3. Communication & State Logging Protocol

When working as an agent on this repository:
1. **At Start of Task**:
   - Read `instructions/PROGRESS.md` to see what phases are completed and what is pending next.
2. **When Changing an Interface / Schema**:
   - Log the proposed contract update in `instructions/DECISIONS.md`.
3. **At End of Task / Phase**:
   - Update `instructions/PROGRESS.md` with:
     - Phase completed (e.g. `Phase 1.1 DONE`).
     - Verification command used and test status.
     - Notes for subsequent phases (e.g. "WebSocket event `incident:created` ready for UI integration").

---

## 4. Coding Conventions & Stack

- **Backend Runtime & Language**: Node.js v20+ (JavaScript / ES Modules).
- **Backend Framework**: Express / Fastify with `ws` or `socket.io` for WebSockets.
- **Backend Libraries**: `ssh2` / `node-ssh` (SSH), `simple-git` (Git automation), `mongoose` / `mongodb` (MongoDB driver).
- **Frontend Framework**: React 18+ with Vite (JavaScript / JSX) & Tailwind CSS.
- **ODM / Database**: MongoDB with Mongoose document models.
- **Code Style**: Async/await for asynchronous I/O, explicit Mongoose schemas, detailed logging.

