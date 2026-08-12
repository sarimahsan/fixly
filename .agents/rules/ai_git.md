# AI Logic & Version Control Integration Rulebook

## Domain Scope
- **Directories**: `src/modules/ai/` and `src/modules/git/`
- **Execution Phase**: Phase 3 (Sequential)
- **Core Deliverables**:
  - Phase 3.1: AI diagnosis generator (`diagnosis.js`)
  - Phase 3.2: Mapping & AI code patch proposal (`code_fixer.js`)
  - Phase 3.3: Line-by-line diff patch generator (`diff_generator.js`)
  - Phase 3.4: `simple-git` repository client & PR creator (`git_client.js`)
  - Phase 3.5: Recovery verifier & auto-resolution monitor (`recovery.js`)

## Rules & Constraints
1. Stack: Node.js v20+ (JavaScript), `simple-git`, AI LLM APIs.
2. Consume incidents and emit `diagnosis:created`, `fix:proposed`, and `incident:resolved` WebSocket events per `instructions/DECISIONS.md`.
3. Do not let AI edit files outside the target code mapping.
4. Test AI functions and Git commit flow before declaring phase completion.
5. Log completed phases in `instructions/PROGRESS.md`.
