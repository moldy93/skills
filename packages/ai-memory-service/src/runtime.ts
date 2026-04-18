import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { GuardrailSettings, MemoryRootSource, RuntimePaths } from "./types.ts";

export const REPO_MANIFEST_NAME = ".mempalace.json";
export const CODEX_REPO_PLUGIN_LINK_NAME = ".codex-plugin";
const DEFAULT_MEMORY_DIRECTORY_NAME = "ai-memory";
const DEFAULT_PYTHON_COMMAND = "python3";

interface RuntimeResolutionOptions {
  arch?: string;
  existsSync?: (targetPath: string) => boolean;
  homeDir?: string;
  platform?: NodeJS.Platform;
}

function isTruthy(value: string): boolean {
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function isFalsy(value: string): boolean {
  return ["0", "false", "no", "off"].includes(value.toLowerCase());
}

export function resolveTranscriptAutoMineSettings(
  env: NodeJS.ProcessEnv,
): { enabled: boolean; reason?: string } {
  const configuredValue = env.AI_MEMORY_TRANSCRIPT_AUTO_MINE?.trim();
  if (!configuredValue) {
    return { enabled: true };
  }

  if (isTruthy(configuredValue)) {
    return { enabled: true };
  }

  if (isFalsy(configuredValue)) {
    return {
      enabled: false,
      reason:
        "Automatic transcript mining is disabled by AI_MEMORY_TRANSCRIPT_AUTO_MINE. Set AI_MEMORY_TRANSCRIPT_AUTO_MINE=1 when you want to re-enable it.",
    };
  }

  return {
    enabled: true,
    reason:
      "AI_MEMORY_TRANSCRIPT_AUTO_MINE was set but not recognized. Supported values are 1/0, true/false, yes/no, or on/off.",
  };
}

export function resolveGuardrails(
  env: NodeJS.ProcessEnv,
  platform: NodeJS.Platform = process.platform,
  arch: string = process.arch,
): GuardrailSettings {
  const appleSilicon = platform === "darwin" && arch === "arm64";
  const configuredThreads = env.CHROMA_HNSW_NUM_THREADS?.trim();
  const configuredOrt = env.ORT_DISABLE_COREML?.trim();

  return {
    appleSilicon,
    ortDisableCoreMl: configuredOrt || (appleSilicon ? "1" : undefined),
    chromaHnswNumThreads: configuredThreads || (appleSilicon ? "1" : undefined),
    defaultedChromaThreads: appleSilicon && !configuredThreads,
  };
}

function resolveMemoryRoot(
  env: NodeJS.ProcessEnv,
  options: RuntimeResolutionOptions = {},
): { memoryRoot: string; source: MemoryRootSource; usesSharedMount: boolean } {
  const existsSync = options.existsSync ?? fs.existsSync;
  const homeDir = options.homeDir ?? os.homedir();
  const platform = options.platform ?? process.platform;

  const configuredRoot = env.AI_MEMORY_ROOT?.trim();
  if (configuredRoot) {
    return {
      memoryRoot: path.resolve(configuredRoot),
      source: "env:AI_MEMORY_ROOT",
      usesSharedMount: false,
    };
  }

  const configuredMdataRoot = env.AI_MEMORY_MDATA_ROOT?.trim();
  if (configuredMdataRoot) {
    return {
      memoryRoot: path.resolve(configuredMdataRoot, DEFAULT_MEMORY_DIRECTORY_NAME),
      source: "env:AI_MEMORY_MDATA_ROOT",
      usesSharedMount: true,
    };
  }

  if (platform === "darwin") {
    return {
      memoryRoot: path.join(homeDir, "Library", "Application Support", DEFAULT_MEMORY_DIRECTORY_NAME),
      source: "macos-home",
      usesSharedMount: false,
    };
  }

  const xdgRoot = env.XDG_DATA_HOME?.trim() || path.join(homeDir, ".local", "share");
  return {
    memoryRoot: path.join(xdgRoot, DEFAULT_MEMORY_DIRECTORY_NAME),
    source: env.XDG_DATA_HOME?.trim() ? "xdg-home" : "local-share",
    usesSharedMount: false,
  };
}

function resolvePythonCommand(
  env: NodeJS.ProcessEnv,
  memoryRoot: string,
  existsSync: (targetPath: string) => boolean,
): string {
  const candidates = [
    env.AI_MEMORY_PYTHON_COMMAND?.trim(),
    path.join(memoryRoot, "runtime", "py313", "bin", "python"),
    "/opt/homebrew/bin/python3.13",
    "/opt/homebrew/bin/python3",
    DEFAULT_PYTHON_COMMAND,
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (candidate === DEFAULT_PYTHON_COMMAND || existsSync(candidate)) {
      return candidate;
    }
  }

  return DEFAULT_PYTHON_COMMAND;
}

export function resolveRuntimePaths(
  env: NodeJS.ProcessEnv = process.env,
  options: RuntimeResolutionOptions = {},
): RuntimePaths {
  const existsSync = options.existsSync ?? fs.existsSync;
  const homeDir = options.homeDir ?? os.homedir();
  const platform = options.platform ?? process.platform;
  const arch = options.arch ?? process.arch;
  const transcriptAutoMine = resolveTranscriptAutoMineSettings(env);
  const guardrails = resolveGuardrails(env, platform, arch);
  const memoryRootInfo = resolveMemoryRoot(env, {
    existsSync,
    homeDir,
    platform,
  });
  const pythonCommand = resolvePythonCommand(env, memoryRootInfo.memoryRoot, existsSync);
  const mempalaceHome = env.AI_MEMORY_MEMPALACE_HOME?.trim() || path.join(homeDir, ".mempalace");
  const codexHome = env.CODEX_HOME?.trim() || path.join(homeDir, ".codex");
  const openclawHome = env.OPENCLAW_HOME?.trim() || path.join(homeDir, ".openclaw");

  return {
    codexConfigPath: path.join(codexHome, "config.toml"),
    codexHome,
    codexLocalPluginRoot: path.join(codexHome, "local-plugins", "mempalace-shared"),
    codexRepoPluginLinkName: CODEX_REPO_PLUGIN_LINK_NAME,
    codexSessionHashStorePath: path.join(memoryRootInfo.memoryRoot, "state", "codex-session-hashes.json"),
    codexStagingRoot: path.join(memoryRootInfo.memoryRoot, "staging", "codex"),
    guardrails,
    homeDir,
    identityPath: path.join(mempalaceHome, "identity.txt"),
    manualStagingRoot: path.join(memoryRootInfo.memoryRoot, "staging", "manual"),
    mempalaceConfigPath: path.join(mempalaceHome, "config.json"),
    mempalaceHome,
    mempalaceWingConfigPath: path.join(mempalaceHome, "wing_config.json"),
    memoryRoot: memoryRootInfo.memoryRoot,
    memoryRootSource: memoryRootInfo.source,
    openclawHome,
    openclawSkillsRoot: path.join(openclawHome, "skills"),
    palacePath: path.join(memoryRootInfo.memoryRoot, "palace"),
    pythonCommand,
    repoManifestName: REPO_MANIFEST_NAME,
    stateRoot: path.join(memoryRootInfo.memoryRoot, "state"),
    transcriptAutoMineEnabled: transcriptAutoMine.enabled,
    transcriptAutoMineReason: transcriptAutoMine.reason,
    usesSharedMount: memoryRootInfo.usesSharedMount,
  };
}
