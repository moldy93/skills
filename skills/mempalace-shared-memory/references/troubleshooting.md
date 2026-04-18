# Troubleshooting

## Doctor first

Run:

```bash
ai-memory-doctor
```

Check:

- resolved memory root
- MemPalace import status
- palace path exists or not
- shared mount vs local fallback
- Apple Silicon guardrails

## Common fixes

If the repo is not opted in:

```bash
ai-memory-init <repo-root>
```

If memory is stale:

```bash
ai-memory-mine <repo-root>
```

If Codex is missing MCP setup:

```bash
ai-memory-bootstrap-codex <repo-root>
```

If OpenClaw is missing the skill:

```bash
ai-memory-bootstrap-openclaw
```

## Apple Silicon

`ai-memory-mcp-server` applies these defaults on `darwin/arm64` unless you override them:

- `ORT_DISABLE_COREML=1`
- `CHROMA_HNSW_NUM_THREADS=1`

Search runs in a child process so a native MemPalace search failure does not kill the MCP transport.
