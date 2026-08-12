# Fixly — Workspace Agent Rules

This workspace follows sequential phase development directly on `main` according to `instructions/map.md`.

## Active Rules
1. **Single Branch Strategy**: All work is developed and committed directly to the `main` branch. No user-specific branches are used.
2. **Sequential Execution**: Follow the phase order defined in [map.md](file:///f:/fixly/instructions/map.md) (Phase 0 Foundation → Phase 1 Auth & Settings API → Phase 2 Monitoring → Phase 3 AI & Git → Phase 4 UI Dashboard → Phase 5 E2E Verification).
3. **Contract Consistency**: Check [DECISIONS.md](file:///f:/fixly/instructions/DECISIONS.md) before implementing API endpoints or WebSocket event producers/consumers.
4. **State Logging**: Log completed phases and verification results in [PROGRESS.md](file:///f:/fixly/instructions/PROGRESS.md).

