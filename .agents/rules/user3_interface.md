# User 3 — Interface & User Experience Agent Rulebook

## Ownership Scope
- **Directory**: `src/client/`
- **Branch**: `user-3/ui`
- **Core Deliverables**:
  - Phase 3.1: Live Incident Feed & Server Vitals Dashboard (`LiveFeed.jsx`, `ServerVitalsWidget.jsx`)
  - Phase 3.2: Tracked Issues View & Manual Resolution Modal (`IssuesBoard.jsx`, `ResolveModal.jsx`)
  - Phase 3.3: Resolved Incident History & Code Diff Viewer (`HistoryList.jsx`, `DiffViewer.jsx`)
  - Phase 3.4: Settings View for Masked Repository Token (`SettingsForm.jsx`)
  - Phase 3.5: Role-Aware UI action button visibility

## Rules & Constraints
1. Stack: React 18+ with Vite (JavaScript / JSX) & Tailwind CSS.
2. Do not build backend services, SSH layer, or AI logic. Consume backend Node.js REST endpoints & WebSocket events defined in `instructions/DECISIONS.md`.
3. Support live WebSocket events (`incident:created`, `incident:updated`, `incident:resolved`, `vitals:updated`, `diagnosis:created`, `fix:proposed`).
4. Mask sensitive tokens in Settings UI. Hide/disable admin action controls for non-ADMIN users based on `AuthContext`.
5. Log completed phases in `instructions/PROGRESS.md`.
