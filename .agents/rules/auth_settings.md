# Auth, Roles & Settings API Rulebook

## Domain Scope
- **Directories**: `src/models/`, `src/modules/auth/`
- **Execution Phase**: Phase 0 & Phase 1 (Sequential)
- **Core Deliverables**:
  - Phase 0: Shared Foundation — Build `src/common/types.js` and Mongoose models (`src/models/`).
  - Phase 1.1: Password hashing & JWT Auth service (`auth_service.js`)
  - Phase 1.2: Role-Based Access Control middleware (`rbac_middleware.js`)
  - Phase 1.3: Backend Server & Repository Settings API (`settings_service.js`) with token encryption.

## Rules & Constraints
1. Stack: Node.js v20+ (JavaScript), Express / Fastify, Mongoose ORM.
2. Maintain Mongoose MongoDB models and database connection (`src/common/db.js`, `src/models/`).
3. Provide backend authentication (`/api/auth/login`) and settings endpoints (`/api/settings`).
4. Log completed phases in `instructions/PROGRESS.md`.
