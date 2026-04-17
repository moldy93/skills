---
name: openclaw-telegram-notify
description: Use when an agent should send the user a concise Telegram notification from this machine through the local OpenClaw gateway. Suitable for `done`, `blocked`, `failed`, `needs input`, or `warning` messages. Prefer one purposeful notification over progress spam, validate channel health when uncertain, and resolve the Telegram target from task context or local configuration instead of hard-coding it.
metadata: {"openclaw":{"requires":{"bins":["openclaw"]}}}
---

# OpenClaw Telegram Notify

Use this skill when you need to send the user a Telegram message from the local machine.

## Required behavior

1. Keep messages short and concrete.
2. Start with one of: `done:`, `blocked:`, `failed:`, `needs input:`, or `warning:`.
3. Include only the minimum context the user needs to act.
4. Do not send secrets, tokens, API keys, or sensitive file contents.
5. Prefer one message at the end of meaningful work unless the user explicitly asked for progress updates.
6. If you are unsure the gateway or Telegram channel is healthy, validate first.
7. Do not hard-code Telegram chat IDs or usernames in the skill. Resolve the target from explicit task context, a local environment variable, or ask the user.
8. If more than one Telegram account is configured, inspect accounts with `openclaw channels list --json` and send with `--account <id>`.
9. Retry a failed send at most once after fixing the underlying issue.

## Resolve target

Use this order:

1. Explicit target from the user or current task context.
2. `TELEGRAM_TARGET` if it is already set in the shell.
3. `OPENCLAW_TELEGRAM_TARGET` if it is already set in the shell.
4. If none exist, stop and tell the user `needs input:` because `openclaw message send` requires `--target`.

## Default commands

Resolve target first:

```bash
TARGET="${TELEGRAM_TARGET:-$OPENCLAW_TELEGRAM_TARGET}"

if [ -z "$TARGET" ]; then
  echo "needs input: Telegram target missing. Set TELEGRAM_TARGET or OPENCLAW_TELEGRAM_TARGET."
  exit 1
fi
```

Send:

```bash
openclaw message send \
  --channel telegram \
  --target "$TARGET" \
  --message "YOUR MESSAGE HERE"
```

Dry run:

```bash
openclaw message send \
  --channel telegram \
  --target "$TARGET" \
  --message "YOUR MESSAGE HERE" \
  --dry-run \
  --json
```

If you need a specific configured Telegram account:

```bash
openclaw message send \
  --channel telegram \
  --account <account-id> \
  --target "$TARGET" \
  --message "YOUR MESSAGE HERE"
```

## Validation

If you are unsure the channel is healthy, run:

```bash
openclaw channels status --probe --json
```

You want Telegram to be healthy and ready to send.

For broader gateway state, run:

```bash
openclaw health --json
```

## Failure handling

If sending fails:

1. Check gateway health:

```bash
openclaw health --json
```

2. Check channel health:

```bash
openclaw channels status --probe --json
```

3. If Telegram account selection may be wrong, inspect configured accounts:

```bash
openclaw channels list --json
```

4. If the CLI reports pairing or auth problems, inspect device state:

```bash
openclaw devices list --json
```

5. Retry the send once after the issue is fixed.

## Good messages

```text
done: OpenClaw Telegram channel reconfigured and verified.
blocked: Time Machine inclusion for /Volumes/mdata still needs sudo tmutil removeexclusion -p.
failed: Workspace migration verification failed because /Volumes/mdata was unavailable.
needs input: Telegram target is missing; provide it or set OPENCLAW_TELEGRAM_TARGET.
warning: Gateway is healthy but Telegram probes are timing out.
```

## When not to use this skill

- Do not use it for internal reasoning.
- Do not use it for high-frequency progress spam unless the user explicitly asked for that.
- Do not use it when the message adds no value beyond the active chat.
