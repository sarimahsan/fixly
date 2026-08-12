# User 4 — Demo Environment, Access Control & Lead Agent Rulebook

## Ownership Scope
- **Directories**: `src/modules/auth/`, `src/models/`, `target_environment/`
- **Branch**: `user-4/lead-auth`
- **Core Deliverables**:
  - Phase 0: Initial Shared Foundation — Build & push `src/common/types.js` and Mongoose MongoDB models (`src/models/`) to `main` before feature branches branch off.
  - Phase 4.1: Target Environment & Reproducible Error Harness (`target_environment/`)
  - Phase 4.2: Node.js Express/Fastify Server setup, Mongoose models (`src/models/`), JWT Auth, RBAC middleware & Backend REST APIs (`/api/auth/login`, `/api/incidents`, `/api/settings`)
  - Phase 4.3: Integration Checkpoints across User 1, 2, and 3 contracts
  - Phase 4.4: End-to-End Verification test script
  - Phase 4.5: Final Walkthrough preparation

## Rules & Constraints
1. Stack: Node.js v20+ (JavaScript), Express / Fastify, Mongoose ORM.
2. Own Mongoose MongoDB models and database connection (`src/common/db.js`, `src/models/`).
3. Provide backend authentication (`/api/auth/login`) and settings endpoints (`/api/settings`).
4. Ensure error scenarios in `target_environment/` reliably trigger reproducible errors mapped to fixable code files for User 2.
5. Verify all feature branches (`user-1/monitoring`, `user-2/ai-git`, `user-3/ui`, `user-4/lead-auth`) before merging into `main`.
6. Log completed phases in `instructions/PROGRESS.md`.
