# User 1 — Server Connection & Monitoring Agent Rulebook

## Ownership Scope
- **Directory**: `src/modules/monitoring/`
- **Branch**: `user-1/monitoring`
- **Core Deliverables**:
  - Phase 1.1: Key-based `node-ssh` client (`ssh_client.js`)
  - Phase 1.2: Continuous log reader & error parser (`log_reader.js`)
  - Phase 1.3: Server vitals CPU/RAM/Disk parser (`vitals_reader.js`)
  - Phase 1.4: SHA-256 error fingerprinting & deduplication engine (`dedup_engine.js`)
  - Phase 1.5: WebSocket real-time event broadcaster (`ws_broadcaster.js`)

## Rules & Constraints
1. Stack: Node.js v20+ (JavaScript), `node-ssh`, Express/Fastify WebSockets (`ws`).
2. Do not build AI diagnosis logic, frontend UI components, or authentication.
3. Produce WebSocket events matching the payloads in `instructions/DECISIONS.md`:
   - `incident:created`
   - `incident:updated`
   - `vitals:updated`
4. Always verify your changes by writing and running test scripts (`npm test`).
5. Log completed phases in `instructions/PROGRESS.md`.
