---
name: multica
description: Manage Multica from the CLI for setup, authentication, daemon control, workspace inspection, issues, comments, subscribers, run history, and projects. Use when working with Multica workspaces, issues, projects, comments, runtimes, or the local daemon.
homepage: https://multica.ai
metadata: {"openclaw":{"homepage":"https://multica.ai","requires":{"bins":["multica"]},"install":[{"id":"brew","kind":"brew","formula":"multica-ai/tap/multica","bins":["multica"],"label":"Install Multica CLI (brew)"}]}}
---

# Multica

Use the agent's shell or exec tool to run `multica`. Stay on the CLI for v1; do not switch to direct HTTP or custom scripts when the CLI can do the job.

## Working Style

- Prefer commands that support `--output json`, then summarize the result unless the user asks for raw JSON.
- Default to the active profile and active workspace unless the user names another profile or workspace.
- Discover IDs, assignee names, project IDs, comment IDs, and task IDs before acting when they are not explicit.
- Read first when the request is broad, ambiguous, or uses vague verbs like “manage”, “take care of”, or “handle”.

## Mutating Actions

Treat these as explicit mutating or admin verbs:

- `create`
- `update`
- `assign`
- `comment`
- `delete`
- `subscribe`
- `unsubscribe`
- `login`
- `logout`
- `setup`
- `start`
- `stop`
- `restart`

Do not mutate on vague requests. Inspect first, summarize current state, and ask a narrow follow-up only if needed.

## Prerequisites

If `multica` is missing:

- Prefer Homebrew: `brew install multica-ai/tap/multica`
- Manual fallback: `curl -fsSL https://raw.githubusercontent.com/multica-ai/multica/main/scripts/install.sh | bash`

If authentication is missing:

- Use `multica setup` for the cloud default
- Or use `multica login`
- Use `multica auth status` to verify

If the daemon is required and not running:

- Use `multica daemon start`
- Use `multica daemon status --output json` to verify

## Execution Rules

- Use `multica setup` or `multica setup cloud` for Multica Cloud.
- Use `multica setup self-host` only when the user explicitly wants a self-hosted server.
- Use `--content-stdin` for long or quote-heavy comments to avoid shell escaping issues.
- Prefer targeted commands over broad listings when the user already gave an issue ID or project ID.
- When the CLI does not expose a command that the user asked for, say so plainly instead of inventing flags or subcommands.

## References

Read `{baseDir}/references/cli-recipes.md` for exact command patterns and current CLI caveats.
