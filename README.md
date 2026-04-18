# @moldy/skills

Public-safe repository for reusable agent skills and local AI memory tooling.

- `skills/` contains self-contained skills
- `.claude-plugin/marketplace.json` groups skills for Claude Code plugin marketplace installs
- `template/` provides a minimal starting point for future skills

## Included Skills

- `multica` — manage Multica from the CLI for setup, auth, daemon control, workspaces, issues, comments, runs, subscribers, and projects
- `openclaw-telegram-notify` — send concise Telegram notifications through the local OpenClaw gateway without hard-coding the recipient target
- `mempalace-shared-memory` — use shared MemPalace history for past decisions, debugging context, and repo memory bootstrapping

## Included Package

- `packages/ai-memory-service` — reusable local service package with:
  - `ai-memory-init`
  - `ai-memory-mine`
  - `ai-memory-mcp-server`
  - `ai-memory-bootstrap-codex`
  - `ai-memory-bootstrap-openclaw`
  - `ai-memory-doctor`

## Repository Layout

```text
.
├── .claude-plugin/
│   └── marketplace.json
├── packages/
│   └── ai-memory-service/
├── skills/
│   ├── mempalace-shared-memory/
│   │   ├── SKILL.md
│   │   └── references/
│   ├── multica/
│   │   ├── SKILL.md
│   │   └── references/
│   └── openclaw-telegram-notify/
│       └── SKILL.md
├── template/
│   └── SKILL.md
├── tests/
│   └── repository.test.ts
└── package.json
```

## Install

### Local service package

Install the reusable AI memory service from this repo clone:

```bash
npm install -g ./packages/ai-memory-service
ai-memory-doctor
```

### Skill repos

Install skills from any compatible repo URL:

```bash
npx skills add <repo-url> --skill multica
npx skills add <repo-url> --skill openclaw-telegram-notify
npx skills add <repo-url> --skill mempalace-shared-memory
```

### OpenClaw

Copy or sync skill directories into your local OpenClaw skills folder:

```bash
mkdir -p ~/.openclaw/skills
rsync -a ./skills/multica/ ~/.openclaw/skills/multica/
rsync -a ./skills/openclaw-telegram-notify/ ~/.openclaw/skills/openclaw-telegram-notify/
rsync -a ./skills/mempalace-shared-memory/ ~/.openclaw/skills/mempalace-shared-memory/
```

Or install the memory skill through the service package:

```bash
ai-memory-bootstrap-openclaw
```

Then start a new OpenClaw session and verify with:

```bash
openclaw skills list
```

### Codex

Once `ai-memory-service` is installed:

```bash
ai-memory-bootstrap-codex <repo-root>
ai-memory-init <repo-root>
```

That writes the Codex MCP entry, installs the local hook bundle, and opts the repo into shared memory with `.mempalace.json`.

## Notes

- The shared repo contains no checked-in personal paths, chat IDs, or private contact metadata.
- Runtime defaults stay configurable through environment variables and still work on a clean machine through path probing.
