# Fixly — Codebase Directory Structure

This document outlines the modular directory structure designed for parallel agentic development. Each top-level domain folder maps strictly to the responsibility matrix defined in `instructions/map.md`.

---

## High-Level Tree View

```
fixly/
├── .agents/                      # Memory & Agentic workflow control files
│   ├── AGENTS.md                 # Master AI Coding Agent Instructions & Rules
│   └── rules/                    # Role-specific guidance files
│       ├── user1_monitoring.md
│       ├── user2_ai_git.md
│       ├── user3_interface.md
│       └── user4_lead_auth.md
├── instructions/                 # Core specification & contracts
│   ├── map.md                    # Master user ownership roadmap
│   ├── schema.md                 # MongoDB Mongoose database schema specification
│   ├── directory_structure.md    # Codebase tree documentation (this file)
│   ├── DECISIONS.md              # Cross-user API & WebSocket contracts
│   └── PROGRESS.md               # Real-time state & phase completion tracker
├── src/                          # Main Application Source Code
│   ├── common/                   # Shared schemas, loggers, MongoDB Mongoose connection (User 4/Shared)
│   │   ├── config.js
│   │   ├── db.js                 # Mongoose MongoDB connection bootstrap
│   │   ├── logger.js
│   │   └── types.js
│   ├── models/                   # Mongoose Document Models (User 4 / Shared)
│   │   ├── User.js
│   │   ├── MonitoredServer.js
│   │   ├── Incident.js
│   │   ├── IncidentOccurrence.js
│   │   ├── ServerVitals.js
│   │   ├── AppSetting.js
│   │   └── AuditLog.js
│   ├── server/                   # Express / Fastify Server App & Route Registries
│   │   ├── app.js
│   │   ├── server.js
│   │   └── routes/
│   ├── modules/                  # Subsystem Domains (split by User ownership)
│   │   ├── monitoring/           # [USER 1] SSH Connection, Vitals & Deduplication
│   │   │   ├── ssh_client.js     # Phase 1.1: Key-based node-ssh client
│   │   │   ├── log_reader.js     # Phase 1.2: Continuous log reader & error parser
│   │   │   ├── vitals_reader.js  # Phase 1.3: CPU, RAM, Disk vitals parser
│   │   │   ├── dedup_engine.js   # Phase 1.4: SHA-256 fingerprinting & dedup
│   │   │   └── ws_broadcaster.js # Phase 1.5: Real-time event publisher
│   │   ├── ai/                   # [USER 2] AI Diagnosis & Code Fix Engine
│   │   │   ├── diagnosis.js      # Phase 2.1: Root cause & confidence scorer
│   │   │   ├── code_fixer.js     # Phase 2.2: Mapping & AI code patch proposer
│   │   │   └── diff_generator.js # Phase 2.3: Line-by-line diff engine
│   │   ├── git/                  # [USER 2] Version Control Integration
│   │   │   ├── git_client.js     # Phase 2.4: simple-git repository connection & PR creator
│   │   │   └── recovery.js       # Phase 2.5: Auto-resolution monitor
│   │   └── auth/                 # [USER 4] Role-Based Access, Auth & Settings API
│   │       ├── auth_service.js   # Phase 4.2: Password hashing & JWT issue
│   │       ├── rbac_middleware.js# Phase 4.2: Role validation middleware
│   │       └── settings_service.js# Phase 4.2: Backend settings GET/PUT & encryption
│   └── client/                   # [USER 3] Frontend React + Vite + Tailwind CSS Dashboard
│       ├── index.html
│       ├── vite.config.js
│       ├── tailwind.config.js
│       ├── postcss.config.js
│       ├── package.json
│       ├── src/
│       │   ├── index.css         # Tailwind directives (@tailwind base; components; utilities;)
│       │   ├── main.jsx
│       │   ├── App.jsx
│       │   ├── components/
│       │   │   ├── layout/
│       │   │   │   ├── Navbar.jsx
│       │   │   │   └── Sidebar.jsx
│       │   │   ├── dashboard/    # Phase 3.1: Live Incident Feed & Vitals Card
│       │   │   │   ├── LiveFeed.jsx
│       │   │   │   └── ServerVitalsWidget.jsx
│       │   │   ├── issues/       # Phase 3.2: Tracked Issues Board & Resolve Modal
│       │   │   │   ├── IssuesBoard.jsx
│       │   │   │   └── ResolveModal.jsx
│       │   │   ├── history/      # Phase 3.3: Resolved Incident History & Diff
│       │   │   │   ├── HistoryList.jsx
│       │   │   │   └── DiffViewer.jsx
│       │   │   ├── profile/      # User Profile View
│       │   │   │   └── UserProfile.jsx
│       │   │   └── settings/     # Phase 3.4 & 3.5: Masked Token Settings Form (UI)
│       │   │       └── SettingsForm.jsx
│       │   ├── context/
│       │   │   ├── AuthContext.jsx
│       │   │   └── WebSocketContext.jsx
│       │   └── hooks/
│       │       ├── useIncidents.js
│       │       ├── useVitals.js
│       │       └── useAuth.js
└── target_environment/          # [USER 4] Demo App & Triggerable Error Harness
    ├── app/                      # Target server application being monitored
    │   ├── server.js
    │   ├── faulty_routes.js      # Bugs mapped for User 2 fixes
    │   └── logs/
    │       └── app.log
    └── trigger_panel/            # Button panel to invoke error scenarios
        └── trigger_errors.sh
```

---

## User Ownership Breakdown

| Folder / Module Path | Primary Owner | Scope & Responsibility |
| :--- | :--- | :--- |
| `src/modules/monitoring/` | **User 1** | Node.js `node-ssh` transport, continuous log streaming, vitals parser, fingerprint dedup logic, WS broadcaster. |
| `src/modules/ai/` & `src/modules/git/` | **User 2** | AI diagnosis prompt runner, code fix mapper, `simple-git` unified diff patcher, Git PR/commit pusher, recovery verifier. |
| `src/client/` | **User 3** | React + Vite + Tailwind CSS UI, WebSocket live feed, incident tracking views, code diff viewer modal, role-aware button visibility. |
| `src/modules/auth/`, `src/models/`, `target_environment/` | **User 4** | Express/Fastify server bootstrap, Mongoose models, JWT auth, RBAC middleware, backend settings API (`GET`/`PUT /api/settings`), target server error simulator, end-to-end integration harness. |

---

## Guidelines for Parallel Agent Execution
1. **Never write outside your module folder** without consulting `instructions/DECISIONS.md`.
2. **Import shared contracts** exclusively from `src/common/types.js` (Backend) / `src/client/src/types.js` (Frontend) and models from `src/models/`.
3. **If you need an interface change**, update `instructions/DECISIONS.md` first and log it in `instructions/PROGRESS.md`.
