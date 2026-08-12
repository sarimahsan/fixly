# Fixly — Workspace Agent Rules

This workspace uses multi-agent parallel development according to `instructions/map.md`.

## Active Rules
1. **User Role Boundary**: Always confirm the active User ID (User 1, 2, 3, 4) and restrict file edits to your owned domain:
   - User 1: `src/modules/monitoring/` (Branch: `user-1/monitoring`)
   - User 2: `src/modules/ai/`, `src/modules/git/` (Branch: `user-2/ai-git`)
   - User 3: `src/client/` (Branch: `user-3/ui`)
   - User 4: `src/modules/auth/`, `src/models/`, `target_environment/` (Branch: `user-4/lead-auth`) (Owns Auth, Mongoose Schemas & Backend Settings API `PUT/GET /api/settings`)
2. **Git Branching & Merging**: 
   - **Phase 0 (Shared Foundation)**: User 4 commits initial `src/common/types.js` and `src/models/` to `main` first so all agents have shared type definitions.
   - Every User then branches off `main` to their dedicated branch (`user-1/monitoring`, `user-2/ai-git`, `user-3/ui`, `user-4/lead-auth`). Do NOT merge feature branches into `main` until Phase 4.4 verification.
3. **Contract Consistency**: Check [DECISIONS.md](file:///f:/fixly/instructions/DECISIONS.md) before implementing API endpoints or WebSocket event producers/consumers.
4. **State Logging**: Log completed phases and verification results in [PROGRESS.md](file:///f:/fixly/instructions/PROGRESS.md).
