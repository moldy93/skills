import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const packageRoot = path.resolve(import.meta.dirname, "..");
const bootstrapCodexBin = path.join(packageRoot, "bin", "ai-memory-bootstrap-codex");
const initBin = path.join(packageRoot, "bin", "ai-memory-init");

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

test("ai-memory-init creates a neutral repo manifest", () => {
  const tempHome = makeTempDir("ai-memory-home-");
  const tempRepo = makeTempDir("ai-memory-repo-");
  fs.writeFileSync(path.join(tempRepo, "README.md"), "# demo\n");
  fs.mkdirSync(path.join(tempRepo, "src"));

  const result = spawnSync(initBin, [tempRepo], {
    cwd: tempRepo,
    encoding: "utf8",
    env: {
      ...process.env,
      HOME: tempHome,
      AI_MEMORY_ROOT: path.join(tempHome, "memory"),
      AI_MEMORY_PYTHON_COMMAND: "/usr/bin/false",
    },
  });

  assert.equal(result.status, 0, result.stderr);
  const manifest = JSON.parse(fs.readFileSync(path.join(tempRepo, ".mempalace.json"), "utf8")) as {
    enabled: boolean;
    project: string;
    wing: string;
    minePaths: string[];
  };
  assert.equal(manifest.enabled, true);
  assert.match(manifest.project, /^ai-memory-repo-/);
  assert.match(manifest.wing, /^wing_/);
  assert.deepEqual(manifest.minePaths, ["src", "README.md"]);
});

test("ai-memory-bootstrap-codex writes MCP config and plugin files without personal paths", () => {
  const tempHome = makeTempDir("ai-memory-codex-home-");
  const tempRepo = makeTempDir("ai-memory-codex-repo-");
  fs.mkdirSync(path.join(tempRepo, ".git"));

  const result = spawnSync(bootstrapCodexBin, [tempRepo], {
    cwd: tempRepo,
    encoding: "utf8",
    env: {
      ...process.env,
      HOME: tempHome,
      CODEX_HOME: path.join(tempHome, ".codex"),
    },
  });

  assert.equal(result.status, 0, result.stderr);

  const configText = fs.readFileSync(path.join(tempHome, ".codex", "config.toml"), "utf8");
  assert.match(configText, /\[mcp_servers\.ai_memory\]/);
  assert.match(configText, /command = "ai-memory-mcp-server"/);

  const pluginRoot = path.join(tempHome, ".codex", "local-plugins", "mempalace-shared");
  const pluginManifest = fs.readFileSync(path.join(pluginRoot, "plugin.json"), "utf8");
  const hookScript = fs.readFileSync(path.join(pluginRoot, "hooks", "mempalace-shared-hook.sh"), "utf8");
  assert.doesNotMatch(pluginManifest, /\/Users\//);
  assert.doesNotMatch(hookScript, /\/Users\//);
  assert.doesNotMatch(hookScript, /\b\d{9,}\b/);

  const pluginLink = path.join(tempRepo, ".codex-plugin");
  assert.equal(fs.lstatSync(pluginLink).isSymbolicLink(), true);
});
