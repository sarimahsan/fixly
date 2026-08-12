# Interface & User Experience Rulebook

## Domain Scope
- **Directory**: `src/client/`
- **Execution Phase**: Phase 4 (Sequential)
- **Core Deliverables**:
  - Phase 4.1: Live Incident Feed & Server Vitals Dashboard (`LiveFeed.jsx`, `ServerVitalsWidget.jsx`)
  - Phase 4.2: Tracked Issues View & Manual Resolution Modal (`IssuesBoard.jsx`, `ResolveModal.jsx`)
  - Phase 4.3: Resolved Incident History & Code Diff Viewer (`HistoryList.jsx`, `DiffViewer.jsx`)
  - Phase 4.4: Settings View for Masked Repository Token (`SettingsForm.jsx`) and Role-Aware UI visibility

## Rules & Constraints
1. Stack: React 18+ with Vite (JavaScript / JSX) & Tailwind CSS.
2. Consume backend Node.js REST endpoints & WebSocket events defined in `instructions/DECISIONS.md`.
3. Support live WebSocket events (`incident:created`, `incident:updated`, `incident:resolved`, `vitals:updated`, `diagnosis:created`, `fix:proposed`).
4. Mask sensitive tokens in Settings UI. Hide/disable admin action controls for non-ADMIN users based on `AuthContext`.
5. Log completed phases in `instructions/PROGRESS.md`.
