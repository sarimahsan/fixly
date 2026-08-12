# Fixly — Codebase Directory Structure

This document outlines the modular directory structure designed for sequential phase development. Each domain folder maps to the system capabilities defined in `instructions/map.md`.

---

## High-Level Tree View

```
fixly/
├── .agents/                      # Memory & Agentic workflow control files
│   ├── AGENTS.md                 # Master AI Coding Agent Instructions & Rules
│   └── rules/                    # Subsystem domain rule guidance files
│       ├── monitoring.md
│       ├── ai_git.md
│       ├── interface.md
│       └── auth_settings.md
├── instructions/                 # Core specification & contracts
│   ├── map.md                    # Master sequential roadmap
│   ├── schema.md                 # MongoDB Mongoose database schema specification
│   ├── directory_structure.md    # Codebase tree documentation (this file)
│   ├── DECISIONS.md              # Shared API & WebSocket contracts
│   └── PROGRESS.md               # Real-time state & phase completion tracker
├── src/                          # Main Application Source Code
│   ├── common/                   # Shared schemas, loggers, MongoDB Mongoose connection
│   │   ├── config.js
│   │   ├── db.js                 # Mongoose MongoDB connection bootstrap
│   │   ├── logger.js
│   │   └── types.js              # Phase 0.1: Shared types & interfaces
│   ├── models/                   # Mongoose Document Models (Phase 0.2)
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
│   ├── modules/                  # Subsystem Domains
│   │   ├── monitoring/           # SSH Connection, Vitals & Deduplication (Phase 2)
│   │   │   ├── ssh_client.js     # Phase 2.1: Key-based node-ssh client
│   │   │   ├── log_reader.js     # Phase 2.2: Continuous log reader & error parser
│   │   │   ├── vitals_reader.js  # Phase 2.3: CPU, RAM, Disk vitals parser
│   │   │   ├── dedup_engine.js   # Phase 2.4: SHA-256 fingerprinting & dedup
│   │   │   └── ws_broadcaster.js # Phase 2.5: Real-time event publisher
│   │   ├── ai/                   # AI Diagnosis & Code Fix Engine (Phase 3)
│   │   │   ├── diagnosis.js      # Phase 3.1: Root cause & confidence scorer
│   │   │   ├── code_fixer.js     # Phase 3.2: Mapping & AI code patch proposer
│   │   │   └── diff_generator.js # Phase 3.3: Line-by-line diff engine
│   │   ├── git/                  # Version Control Integration (Phase 3)
│   │   │   ├── git_client.js     # Phase 3.4: simple-git repository connection & PR creator
│   │   │   └── recovery.js       # Phase 3.5: Auto-resolution monitor
│   │   └── auth/                 # Role-Based Access, Auth & Settings API (Phase 1)
│   │       ├── auth_service.js   # Phase 1.1: Password hashing & JWT issue
│   │       ├── rbac_middleware.js# Phase 1.2: Role validation middleware
│   │       └── settings_service.js# Phase 1.3: Backend settings GET/PUT & encryption
│   └── client/                   # Frontend React + Vite + Tailwind CSS Dashboard (Phase 4)
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
│       │   │   ├── dashboard/    # Phase 4.1: Live Incident Feed & Vitals Card
│       │   │   │   ├── LiveFeed.jsx
│       │   │   │   └── ServerVitalsWidget.jsx
│       │   │   ├── issues/       # Phase 4.2: Tracked Issues Board & Resolve Modal
│       │   │   │   ├── IssuesBoard.jsx
│       │   │   │   └── ResolveModal.jsx
│       │   │   ├── history/      # Phase 4.3: Resolved Incident History & Diff
│       │   │   │   ├── HistoryList.jsx
│       │   │   │   └── DiffViewer.jsx
│       │   │   ├── profile/      # User Profile View
│       │   │   │   └── UserProfile.jsx
│       │   │   └── settings/     # Phase 4.4: Masked Token Settings Form (UI)
│       │   │       └── SettingsForm.jsx
│       │   ├── context/
│       │   │   ├── AuthContext.jsx
│       │   │   └── WebSocketContext.jsx
│       │   └── hooks/
│       │       ├── useIncidents.js
│       │       ├── useVitals.js
│       │       └── useAuth.js
│               └── trigger_errors.sh
```

---

## Domain Subsystem Breakdown

| Folder / Module Path | Build Phase | Scope & Responsibility |
| :--- | :--- | :--- |
1. **Never write outside your module folder** without consulting `instructions/DECISIONS.md`.
2. **Import shared contracts** exclusively from `src/common/types.js` (Backend) / `src/client/src/types.js` (Frontend) and models from `src/models/`.
3. **If you need an interface change**, update `instructions/DECISIONS.md` first and log it in `instructions/PROGRESS.md`.
