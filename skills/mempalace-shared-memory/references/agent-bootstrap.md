# Agent Bootstrap

## Codex

Install the service package:

```bash
npm install -g ./packages/ai-memory-service
```

Bootstrap Codex:

```bash
ai-memory-bootstrap-codex <repo-root>
ai-memory-init <repo-root>
```

What it does:

- writes Codex MCP config for `ai-memory-mcp-server`
- installs the local hook bundle
- links `.codex-plugin` into the repo
- creates `.mempalace.json` for repo opt-in

## OpenClaw

Install the service package first, then:

```bash
ai-memory-bootstrap-openclaw
```

What it does:

- copies `mempalace-shared-memory` into the OpenClaw skills directory
- keeps the skill generic
- uses the same `ai-memory-*` commands as Codex
