---
name: mempalace-shared-memory
description: Use when a repo has `.mempalace.json`, when the user asks about past decisions, previous debugging, repo history, prior sessions, or shared memory. Check shared memory status first, scope searches to the repo wing, trust checked-out code over memory when they disagree, and recover with ai-memory-service commands when memory is unavailable.
metadata: {"openclaw":{"requires":{"bins":["ai-memory-init","ai-memory-mine","ai-memory-mcp-server","ai-memory-bootstrap-codex","ai-memory-bootstrap-openclaw","ai-memory-doctor"]},"install":[{"id":"npm","kind":"npm","package":"ai-memory-service","bins":["ai-memory-init","ai-memory-mine","ai-memory-mcp-server","ai-memory-bootstrap-codex","ai-memory-bootstrap-openclaw","ai-memory-doctor"],"label":"Install ai-memory-service (npm)"}]}}
---

# MemPalace Shared Memory

Use this skill when project memory matters.

Examples:

- past decisions
- previous debugging
- prior sessions
- shared repo memory
- why a change was made before

## Core rules

1. Treat checked-out code as source of truth. Memory helps with history, not current state.
2. If `.mempalace.json` is missing, memory is off for this repo. Do not invent history from memory.
3. Before historical claims, check memory health first.
4. Scope searches to the repo wing from `.mempalace.json` when possible.
5. Keep searches narrow and concrete.
6. After meaningful repo changes, mine the repo again if the user wants shared memory to include the new state.

## Fast path

1. Run `ai-memory-doctor` if memory health is unknown.
2. Read `.mempalace.json` for the repo wing.
3. Use `mempalace_status` before context-heavy historical work.
4. Use `mempalace_search` with `wing: "<wing>"` for prior decisions or debugging.
5. If memory is stale, run `ai-memory-mine <repo-root>`.

## Repo opt-in

Use placeholders only:

```bash
ai-memory-init <repo-root>
```

That creates `.mempalace.json` with:

- `enabled`
- `wing`
- `project`
- `minePaths`

## Agent bootstrap

For Codex:

```bash
ai-memory-bootstrap-codex <repo-root>
```

For OpenClaw:

```bash
ai-memory-bootstrap-openclaw
```

## Search rules

- Use the wing from `.mempalace.json`.
- Search for decisions, regressions, failure modes, and prior fixes.
- Prefer one focused search over broad fishing.
- If search output conflicts with code, trust code and say memory may be stale.

## Recovery

- Run `ai-memory-doctor`
- Re-run `ai-memory-mine <repo-root>`
- If MCP is not configured for Codex, run `ai-memory-bootstrap-codex <repo-root>`
- If OpenClaw is missing the skill, run `ai-memory-bootstrap-openclaw`

## References

- Read `{baseDir}/references/configuration.md` for env vars and path resolution.
- Read `{baseDir}/references/agent-bootstrap.md` for Codex and OpenClaw setup.
- Read `{baseDir}/references/troubleshooting.md` for recovery steps and Apple Silicon notes.
