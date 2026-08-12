# Target Environment & Auth Rulebook

## Domain Scope
- **Directories**: `src/models/`, `src/modules/auth/`, `target_environment/`
- **Execution Phase**: Phase 0 & Phase 1 (Sequential)
- **Core Deliverables**:
  - Phase 0: Shared Foundation — Build `src/common/types.js` and Mongoose models (`src/models/`).
  - Phase 1.1: Target Environment & Reproducible Error Harness (`target_environment/`)
  - Phase 1.2: Express/Fastify Server setup, Mongoose models, JWT Auth, RBAC middleware & Backend REST APIs (`/api/auth/login`, `/api/incidents`, `/api/settings`)

## Rules & Constraints
1. Stack: Node.js v20+ (JavaScript), Express / Fastify, Mongoose ORM.
2. Maintain Mongoose MongoDB models and database connection (`src/common/db.js`, `src/models/`).
3. Provide backend authentication (`/api/auth/login`) and settings endpoints (`/api/settings`).
4. Ensure error scenarios in `target_environment/` reliably trigger reproducible errors mapped to fixable code files.
5. Log completed phases in `instructions/PROGRESS.md`.
