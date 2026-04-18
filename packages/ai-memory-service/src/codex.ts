import fs from "node:fs";
import path from "node:path";
import { ensureDirectory } from "./storage.ts";
import { findRepoRoot } from "./manifest.ts";
import type { RuntimePaths } from "./types.ts";

export function buildCodexPluginManifest(): string {
  return `${JSON.stringify(
    {
      name: "mempalace-shared",
      version: "0.1.0",
      description: "Shared MemPalace hooks for Codex",
      hooks: "./hooks.json",
      interface: {
        displayName: "MemPalace Shared",
        shortDescription: "Shared repo memory hooks for Codex",
        longDescription:
          "Stages Codex session transcripts into a shared MemPalace when a repo opts in with .mempalace.json.",
        developerName: "ai-memory-service",
        category: "Coding",
        capabilities: ["Read", "Write"],
        defaultPrompt: ["Check repo memory status", "Search prior project context"],
        brandColor: "#355E3B",
      },
    },
    null,
    2,
  )}\n`;
}

export function buildCodexHooksJson(): string {
  return `${JSON.stringify(
    {
      hooks: {
        SessionStart: [
          {
            matcher: "*",
            hooks: [{ type: "command", command: "${CODEX_PLUGIN_ROOT}/hooks/mempalace-shared-hook.sh session-start" }],
          },
        ],
        Stop: [
          {
            matcher: "*",
            hooks: [{ type: "command", command: "${CODEX_PLUGIN_ROOT}/hooks/mempalace-shared-hook.sh stop" }],
          },
        ],
        PreCompact: [
          {
            matcher: "*",
            hooks: [{ type: "command", command: "${CODEX_PLUGIN_ROOT}/hooks/mempalace-shared-hook.sh precompact" }],
          },
        ],
      },
    },
    null,
    2,
  )}\n`;
}

export function buildCodexHookScript(): string {
  return `#!/usr/bin/env bash
set -euo pipefail

HOOK_NAME="\${1:?Usage: mempalace-shared-hook.sh <hook-name>}"

if ! command -v ai-memory-codex-hook >/dev/null 2>&1; then
  echo "AI memory hook paused. You need to install ai-memory-service so ai-memory-codex-hook is on PATH."
  exit 0
fi

ai-memory-codex-hook "$HOOK_NAME"
`;
}

export function buildCodexPluginReadme(): string {
  return `# mempalace-shared

This plugin is managed by \`ai-memory-bootstrap-codex\`.

- MCP command: \`ai-memory-mcp-server\`
- Hook command: \`ai-memory-codex-hook\`
- Repo opt-in file: \`.mempalace.json\`
`;
}

function upsertTomlSection(content: string, header: string, bodyLines: readonly string[]): string {
  const lines = content.split(/\r?\n/);
  const headerLine = `[${header}]`;
  const nextContent: string[] = [];
  let index = 0;
  let replaced = false;

  while (index < lines.length) {
    const line = lines[index];
    if (line.trim() === headerLine) {
      replaced = true;
      nextContent.push(headerLine, ...bodyLines, "");
      index += 1;
      while (index < lines.length && !lines[index].startsWith("[")) {
        index += 1;
      }
      continue;
    }

    nextContent.push(line);
    index += 1;
  }

  if (!replaced) {
    if (nextContent.length > 0 && nextContent[nextContent.length - 1] !== "") {
      nextContent.push("");
    }
    nextContent.push(headerLine, ...bodyLines, "");
  }

  return `${nextContent.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`;
}

function ensureRepoPluginSymlink(paths: RuntimePaths, repoRoot: string): string {
  const linkPath = path.join(repoRoot, paths.codexRepoPluginLinkName);
  if (fs.existsSync(linkPath)) {
    const stats = fs.lstatSync(linkPath);
    if (stats.isSymbolicLink()) {
      const currentTarget = fs.readlinkSync(linkPath);
      const resolvedTarget = path.resolve(path.dirname(linkPath), currentTarget);
      if (resolvedTarget === paths.codexLocalPluginRoot) {
        return linkPath;
      }
    }

    throw new Error(
      `Codex plugin setup needs attention at ${linkPath}. Replace that path with a symlink to ${paths.codexLocalPluginRoot} and rerun ai-memory-bootstrap-codex.`,
    );
  }

  fs.symlinkSync(paths.codexLocalPluginRoot, linkPath, "dir");
  return linkPath;
}

export function bootstrapCodex(targetPath: string, paths: RuntimePaths): string {
  ensureDirectory(paths.codexHome);
  ensureDirectory(paths.codexLocalPluginRoot);
  ensureDirectory(path.join(paths.codexLocalPluginRoot, "hooks"));

  fs.writeFileSync(path.join(paths.codexLocalPluginRoot, "plugin.json"), buildCodexPluginManifest(), "utf8");
  fs.writeFileSync(path.join(paths.codexLocalPluginRoot, "hooks.json"), buildCodexHooksJson(), "utf8");
  const hookScriptPath = path.join(paths.codexLocalPluginRoot, "hooks", "mempalace-shared-hook.sh");
  fs.writeFileSync(hookScriptPath, buildCodexHookScript(), "utf8");
  fs.chmodSync(hookScriptPath, 0o755);
  fs.writeFileSync(path.join(paths.codexLocalPluginRoot, "README.md"), buildCodexPluginReadme(), "utf8");

  const existingContent = fs.existsSync(paths.codexConfigPath) ? fs.readFileSync(paths.codexConfigPath, "utf8") : "";
  const nextContent = upsertTomlSection(existingContent, "mcp_servers.ai_memory", [
    'command = "ai-memory-mcp-server"',
    "args = []",
  ]);
  fs.writeFileSync(paths.codexConfigPath, nextContent, "utf8");

  const repoRoot = findRepoRoot(targetPath);
  const pluginLinkPath = ensureRepoPluginSymlink(paths, repoRoot);

  return [
    `Codex AI memory bootstrap is ready for ${repoRoot}.`,
    `Config: ${paths.codexConfigPath}`,
    `Plugin bundle: ${paths.codexLocalPluginRoot}`,
    `Repo plugin link: ${pluginLinkPath}`,
  ].join("\n");
}
