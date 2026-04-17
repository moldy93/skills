# @moldy/skills

Public repository for agent skills.

This repository follows the common multi-skill layout used by repositories like [`anthropics/skills`](https://github.com/anthropics/skills):

- `skills/` contains self-contained skills
- `.claude-plugin/marketplace.json` groups skills for Claude Code plugin marketplace installs
- `template/` provides a minimal starting point for future skills

## Included Skills

- `multica` — manage Multica from the CLI for setup, auth, daemon control, workspaces, issues, comments, runs, subscribers, and projects

## Repository Layout

```text
.
├── .claude-plugin/
│   └── marketplace.json
├── skills/
│   └── multica/
│       ├── SKILL.md
│       └── references/
├── template/
│   └── SKILL.md
└── package.json
```

## Install

### skills.sh style

Install the `multica` skill from the repo once you have pushed it to GitHub:

```bash
npx skills add https://github.com/moldy93/skills --skill multica
```

### OpenClaw

Copy or sync the skill directory into your local OpenClaw skills folder:

```bash
mkdir -p ~/.openclaw/skills
rsync -a ./skills/multica/ ~/.openclaw/skills/multica/
```

Then start a new OpenClaw session and verify with:

```bash
openclaw skills list
```

### Claude Code marketplace

This repo includes a `.claude-plugin/marketplace.json` manifest so it can follow the same grouped-repo pattern as `anthropics/skills`.

## Publish Later

The repo also includes `package.json` so it can be published later as `@moldy/skills`. The npm package is only a packaging wrapper around the repository contents; the actual skills live in `skills/`.
