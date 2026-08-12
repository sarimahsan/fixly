# Server Connection & Monitoring Rulebook

## Domain Scope
- **Directory**: `src/modules/monitoring/`
- **Execution Phase**: Phase 2 (Sequential)
- **Core Deliverables**:
  - Phase 2.1: Key-based `node-ssh` client (`ssh_client.js`)
  - Phase 2.2: Continuous log reader & error parser (`log_reader.js`)
  - Phase 2.3: Server vitals CPU/RAM/Disk parser (`vitals_reader.js`)
  - Phase 2.4: SHA-256 error fingerprinting & deduplication engine (`dedup_engine.js`)
  - Phase 2.5: WebSocket real-time event broadcaster (`ws_broadcaster.js`)

## Rules & Constraints
1. Stack: Node.js v20+ (JavaScript), `node-ssh`, Express/Fastify WebSockets (`ws`).
2. Produce WebSocket events matching the payloads in `instructions/DECISIONS.md`:
   - `incident:created`
   - `incident:updated`
   - `vitals:updated`
3. Always verify changes by writing and running test scripts (`npm test`).
4. Log completed phases in `instructions/PROGRESS.md`.
