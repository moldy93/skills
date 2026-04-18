# ai-memory-service

Reusable local MemPalace service code for shared repo memory.

## Install

From the shared `skills` repo:

```bash
npm install -g ./packages/ai-memory-service
```

## Commands

- `ai-memory-doctor`
- `ai-memory-bootstrap-codex [repo-root]`
- `ai-memory-bootstrap-openclaw`
- `ai-memory-init <repo-root>`
- `ai-memory-mine <repo-root>`
- `ai-memory-mcp-server`

## Path Resolution

Memory root precedence:

1. `AI_MEMORY_ROOT`
2. `AI_MEMORY_MDATA_ROOT` + `/ai-memory`
3. `/Volumes/mdata/ai-memory` when present
4. macOS fallback: `~/Library/Application Support/ai-memory`
5. other platforms: `${XDG_DATA_HOME:-~/.local/share}/ai-memory`

## Environment

- `AI_MEMORY_ROOT`
- `AI_MEMORY_MDATA_ROOT`
- `AI_MEMORY_PYTHON_COMMAND`
- `AI_MEMORY_MEMPALACE_HOME`
- `AI_MEMORY_TRANSCRIPT_AUTO_MINE`
- `CHROMA_HNSW_NUM_THREADS`

## Notes

- `ai-memory-mcp-server` is the supported MCP entrypoint.
- On macOS Apple Silicon, the service applies safe defaults for `ORT_DISABLE_COREML` and `CHROMA_HNSW_NUM_THREADS` unless you override them.
- The MCP wrapper isolates MemPalace search work in a child process so native search failures do not kill the stdio transport.
