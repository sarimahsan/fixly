# Fixly

Fixly is an AI-powered incident detection and self-healing system built with Node.js ES modules and Mongoose.

## Phase 1: Auth, Roles & Settings API

Implemented modules:

- `src/modules/auth/auth_service.js`
  - PBKDF2-SHA512 password hashing and verification.
  - HS256 JWT session creation and bearer token verification.
  - `/api/auth/login` route registration helper for Express-style apps.
- `src/modules/auth/rbac_middleware.js`
  - Admin vs viewer RBAC middleware.
  - Admin access: `ADMIN`.
  - Viewer access: `ADMIN`, `OPERATOR`, `READ_ONLY`.
- `src/modules/auth/settings_service.js`
  - `GET /api/settings` for masked settings.
  - `PUT /api/settings` for admin-only updates.
  - Encrypted storage for GitHub/Git access tokens.
- `src/modules/auth/crypto_utils.js`
  - AES-256-GCM encryption/decryption utilities.
  - Secret masking helpers.

## Phase 2: Monitoring Pipeline & Real-Time Broadcasting

Implemented modules:

- `src/modules/monitoring/ssh_client.js`
  - Key-based `node-ssh` connection configuration and command execution helpers.
- `src/modules/monitoring/log_reader.js`
  - Continuous `tail -F` log reader with error filtering, type inference, message normalization, and severity inference.
- `src/modules/monitoring/vitals_reader.js`
  - CPU/RAM/Disk command output parser, periodic reader, optional persistence to `ServerVitals`, and `vitals:updated` broadcasts.
- `src/modules/monitoring/dedup_engine.js`
  - SHA-256 fingerprinting and open-incident deduplication with occurrence recording.
- `src/modules/monitoring/ws_broadcaster.js`
  - WebSocket server on `/ws` emitting `incident:created`, `incident:updated`, and `vitals:updated` payloads.

## Phase 3: AI Logic & Git Automation

Implemented modules:

- `src/modules/ai/diagnosis.js`
  - Deterministic root-cause diagnosis fallback with severity, confidence score, and `diagnosis:created` events.
  - Optional injected AI client support for provider-backed diagnoses.
- `src/modules/ai/code_fixer.js`
  - Safe target-file mapping from stack traces.
  - Code-fix proposal generation constrained to approved project paths.
  - Emits `fix:proposed` events with proposal metadata and unified diffs.
- `src/modules/ai/diff_generator.js`
  - Line-by-line change model and unified diff patch generator for UI rendering.
- `src/modules/git/git_client.js`
  - `simple-git` client for fix branches, applying proposed snippets, commits, optional pushes, and GitHub PR creation.
- `src/modules/git/recovery.js`
  - Recovery-window verifier and monitor that emits `incident:resolved` after matching errors cease.

## Phase 4: React Dashboard

Implemented `src/client/` React + Vite dashboard with:

- Live WebSocket integration on `/ws` for incident, diagnosis, fix proposal, resolution, and vitals events.
- `LiveFeed.jsx` and `ServerVitalsWidget.jsx` for real-time operations visibility.
- `IssuesBoard.jsx`, `ResolveModal.jsx`, `HistoryList.jsx`, and `DiffViewer.jsx` for tracked issue lifecycle, manual resolution, and unified diff review.
- `SettingsForm.jsx` with masked token handling and admin-only write controls through `AuthContext` / `AdminOnly` RBAC guards.

## Configuration

Copy `.env.example` to `.env` and set at minimum:

```bash
MONGODB_URI=mongodb://localhost:27017/fixly
JWT_SECRET=your_jwt_secret_here
SETTINGS_ENCRYPTION_KEY=your_32_byte_or_longer_settings_secret_here
SSH_HOST=your-server.example.com
SSH_USER=ubuntu
SSH_KEY_PATH=/path/to/private/key
MONITOR_LOG_PATH=/var/log/syslog
VITALS_INTERVAL_MS=5000
GITHUB_OWNER=your_github_org_or_user
GITHUB_REPO=your_repository_name
GITHUB_TOKEN=your_github_token_here
GITHUB_BASE_BRANCH=main
```

## Commands

```bash
npm install
npm run test:auth
npm run test:rbac
npm run test:settings
npm run test:monitoring
npm run test:ai-git
npm run client:install
npm run client:build
npm run client:dev
npm test
```

`npm run test:models` attempts a live MongoDB connection and may skip/fail that portion if MongoDB is unavailable.
