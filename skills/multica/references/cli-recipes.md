# Multica CLI Recipes

Use these recipes as the default command patterns for the `multica` skill.

## Conventions

- Prefer `--output json` when the command supports it.
- Summarize JSON unless the user asks for raw output.
- Use the inherited global flags only when needed:
  - `--profile <name>`
  - `--workspace-id <id>`
- Do not invent unsupported workspace watch or unwatch commands. The current CLI exposes `workspace list`, `workspace get`, and `workspace members`.

## Auth And Setup

```bash
multica setup
multica setup cloud
multica setup self-host
multica login
multica login --token
multica auth status
multica auth logout
```

## Daemon

```bash
multica daemon start
multica daemon start --foreground
multica daemon status --output json
multica daemon logs
multica daemon logs -n 100
multica daemon logs -f
multica daemon stop
multica daemon restart
```

## Workspaces

```bash
multica workspace list
multica workspace get
multica workspace get <workspace-id> --output json
multica workspace members
multica workspace members <workspace-id> --output json
```

## Issues

```bash
multica issue list --output json
multica issue list --status <status> --limit 20 --output json
multica issue list --assignee "<name>" --output json
multica issue get <issue-id> --output json
multica issue create --title "<title>" --description "<text>" --output json
multica issue create --title "<title>" --project <project-id> --assignee "<name>" --output json
multica issue update <issue-id> --title "<title>" --description "<text>" --output json
multica issue update <issue-id> --status <status> --priority <priority> --output json
multica issue assign <issue-id> --to "<name>" --output json
multica issue assign <issue-id> --unassign --output json
multica issue status <issue-id> <status> --output json
multica issue runs <issue-id> --output json
multica issue run-messages <task-id> --output json
multica issue run-messages <task-id> --since <sequence> --output json
```

## Comments And Subscribers

```bash
multica issue comment list <issue-id> --output json
multica issue comment add <issue-id> --content "<text>" --output json
printf '%s' "<text>" | multica issue comment add <issue-id> --content-stdin --output json
multica issue comment add <issue-id> --parent <comment-id> --content "<reply>" --output json
multica issue comment delete <comment-id>
multica issue subscriber list <issue-id> --output json
multica issue subscriber add <issue-id> --user "<name>" --output json
multica issue subscriber add <issue-id> --output json
multica issue subscriber remove <issue-id> --user "<name>" --output json
multica issue subscriber remove <issue-id> --output json
```

## Projects

```bash
multica project list --output json
multica project list --status <status> --output json
multica project get <project-id> --output json
multica project create --title "<title>" --description "<text>" --output json
multica project create --title "<title>" --lead "<name>" --icon ":toolbox:" --output json
multica project update <project-id> --title "<title>" --description "<text>" --output json
multica project update <project-id> --lead "<name>" --status <status> --output json
multica project status <project-id> <status> --output json
multica project delete <project-id> --output json
```

## Current CLI Caveats

- `multica setup` defaults to the cloud flow; `multica setup cloud` is the explicit equivalent.
- Workspace watch and unwatch commands are not present in the current CLI.
- Use issue IDs for issue commands, project IDs for project commands, and task IDs for `run-messages`.
