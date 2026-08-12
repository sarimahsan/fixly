# User 2 — AI Logic & Version Control Integration Agent Rulebook

## Ownership Scope
- **Directories**: `src/modules/ai/` and `src/modules/git/`
- **Branch**: `user-2/ai-git`
- **Core Deliverables**:
  - Phase 2.1: AI diagnosis generator (`diagnosis.js`)
  - Phase 2.2: Mapping & AI code patch proposal (`code_fixer.js`)
  - Phase 2.3: Line-by-line diff patch generator (`diff_generator.js`)
  - Phase 2.4: `simple-git` repository client & PR creator (`git_client.js`)
  - Phase 2.5: Recovery verifier & auto-resolution monitor (`recovery.js`)

## Rules & Constraints
1. Stack: Node.js v20+ (JavaScript), `simple-git`, Groq SDK (`groq-sdk` / `llama-3.3-70b-versatile`), `@anthropic-ai/sdk`, `openai`.
2. Consume incidents produced by User 1 and emit `diagnosis:created`, `fix:proposed`, and `incident:resolved` WebSocket events per `instructions/DECISIONS.md`.
3. Do not let AI edit files outside the target code mapping.
4. Test your AI functions and Git commit flow before declaring phase completion.
5. Log completed phases in `instructions/PROGRESS.md`.
