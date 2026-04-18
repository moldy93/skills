# Configuration

## Manifest

Each repo opts in with `.mempalace.json`:

```json
{
  "enabled": true,
  "wing": "<wing>",
  "project": "<project>",
  "minePaths": ["docs", "src", "README.md"]
}
```

## Memory root precedence

1. `AI_MEMORY_ROOT`
2. `AI_MEMORY_MDATA_ROOT` + `/ai-memory`
3. `/Volumes/mdata/ai-memory` when present
4. macOS fallback: `~/Library/Application Support/ai-memory`
5. other platforms: `${XDG_DATA_HOME:-~/.local/share}/ai-memory`

## Supported environment variables

- `AI_MEMORY_ROOT`
- `AI_MEMORY_MDATA_ROOT`
- `AI_MEMORY_PYTHON_COMMAND`
- `AI_MEMORY_MEMPALACE_HOME`
- `AI_MEMORY_TRANSCRIPT_AUTO_MINE`
- `CHROMA_HNSW_NUM_THREADS`

## Defaults

- Memory root is chosen by path probing.
- MemPalace home defaults to `~/.mempalace`.
- Codex home defaults to `~/.codex`.
- OpenClaw home defaults to `~/.openclaw`.
