# Fixly — Agentic Coding Master Instructions & Rules

> **CRITICAL RULE FOR ALL AI CODING AGENTS:**
> Before taking any action, ask the human operator: *"Which User number are you operating as (User 1, User 2, User 3, or User 4)?"*
> **STRICT SCOPE BOUNDARY:** You MUST ONLY read, modify, and build files belonging to your assigned User number as defined in `instructions/map.md` and `instructions/directory_structure.md`. Do not perform work owned by other users.

---

## 1. Core Principles for AI Agents

1. **Role Scoping Enforcement**:
   - **User 1 (Monitoring & Transport)**: Owns `src/modules/monitoring/`.
   - **User 2 (AI Logic & Git)**: Owns `src/modules/ai/` and `src/modules/git/`.
   - **User 3 (UI & UX)**: Owns `src/client/` (Frontend React + Vite + Tailwind CSS Dashboard & Settings UI).
   - **User 4 (Lead & Auth & Target Environment)**: Owns `src/modules/auth/` (Auth & Backend Settings API `GET`/`PUT /api/settings`), `src/models/`, `target_environment/`.
2. **Git Branching Strategy**:
   - **Phase 0 (Shared Foundation)**: User 4 builds and pushes shared types (`src/common/types.js`) and MongoDB Mongoose models (`src/models/`) to `main` first before feature branches are cut.
   - Every User then cuts their dedicated feature branch from `main`:
     - **User 1**: `user-1/monitoring`
     - **User 2**: `user-2/ai-git`
     - **User 3**: `user-3/ui`
     - **User 4**: `user-4/lead-auth`
   - Commit all phase completions to your assigned branch.
   - Do NOT merge feature branches into `main` directly — all feature branches will be merged into `main` at the end after end-to-end verification (Phase 4.4).
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
| [map.md](file:///f:/fixly/instructions/map.md) | **Master Roadmap**: Defines phase deliverables for User 1, 2, 3, 4. |
| [schema.md](file:///f:/fixly/instructions/schema.md) | **DB Schema Reference**: MongoDB Mongoose document models, collections, and subdocuments. |
| [directory_structure.md](file:///f:/fixly/instructions/directory_structure.md) | **Code Tree Reference**: File layout and module ownership matrix. |
| [DECISIONS.md](file:///f:/fixly/instructions/DECISIONS.md) | **Shared Contracts**: API payloads, WebSocket event format, data types. |
| [PROGRESS.md](file:///f:/fixly/instructions/PROGRESS.md) | **Live State Tracker**: Log completed phases, blockers, and agent handoffs. |

---

## 3. Communication Protocols Between Agents

When working as an agent on this repository:
1. **At Start of Task**:
   - Read `instructions/PROGRESS.md` to see what previous agents completed.
   - Confirm your assigned User role.
2. **When Changing a Interface / Schema**:
   - Log the proposed contract update in `instructions/DECISIONS.md`.
3. **At End of Task / Phase**:
   - Update `instructions/PROGRESS.md` with:
     - Phase completed (e.g. `User 1 - Phase 1.1 DONE`).
     - Verification command used and test status.
     - Notes for downstream agents (e.g. "User 3 can consume WebSocket event `incident:created`").

---

## 4. Coding Conventions & Stack

- **Backend Runtime & Language**: Node.js v20+ (JavaScript / ES Modules).
- **Backend Framework**: Express / Fastify with `ws` or `socket.io` for WebSockets.
- **Backend Libraries**: `ssh2` / `node-ssh` (SSH), `simple-git` (Git automation), `mongoose` / `mongodb` (MongoDB driver).
- **Frontend Framework**: React 18+ with Vite (JavaScript / JSX) & Tailwind CSS.
- **ODM / Database**: MongoDB with Mongoose document models.
- **Code Style**: Async/await for asynchronous I/O, explicit Mongoose schemas, detailed logging.
