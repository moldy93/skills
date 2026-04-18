import fs from "node:fs";
import path from "node:path";
import { createDefaultRepoManifest, findRepoRoot, getRepoManifestPath, loadRepoManifest, writeRepoManifest } from "./manifest.ts";
import { formatMemPalaceFailure, isMemPalaceInstalled, runMemPalaceCommand } from "./mempalace.ts";
import { ensureDirectory, ensureMemoryDirectories, readJsonFile, writeJsonFile } from "./storage.ts";
import type { DoctorReport, RepoMemoryManifest, RuntimePaths } from "./types.ts";

interface WingConfigFile {
  default_wing?: string;
  wings?: Record<string, { type: string; keywords: string[] }>;
}

function ensureMemPalaceConfig(paths: RuntimePaths): void {
  ensureDirectory(paths.mempalaceHome);

  const existingConfig = readJsonFile<Record<string, unknown>>(paths.mempalaceConfigPath, {});
  const nextConfig = {
    ...existingConfig,
    palace_path: paths.palacePath,
    collection_name:
      typeof existingConfig.collection_name === "string" && existingConfig.collection_name.length > 0
        ? existingConfig.collection_name
        : "mempalace_drawers",
  };

  writeJsonFile(paths.mempalaceConfigPath, nextConfig);

  if (!fs.existsSync(paths.identityPath)) {
    fs.writeFileSync(
      paths.identityPath,
      "Shared local MemPalace for reusable agent memory.\n",
      "utf8",
    );
  }
}

function ensureWingRegistration(paths: RuntimePaths, repoRoot: string, manifest: RepoMemoryManifest): void {
  const repoName = path.basename(repoRoot).toLowerCase();
  const existing = readJsonFile<WingConfigFile>(paths.mempalaceWingConfigPath, {});
  const nextWingConfig: WingConfigFile = {
    default_wing: existing.default_wing ?? "wing_general",
    wings: {
      ...(existing.wings ?? {}),
      [manifest.wing]: {
        type: "project",
        keywords: Array.from(new Set([repoName, manifest.project.toLowerCase()])),
      },
    },
  };

  writeJsonFile(paths.mempalaceWingConfigPath, nextWingConfig);
}

function shouldSkipDuringSnapshot(entryPath: string): boolean {
  const baseName = path.basename(entryPath);
  return [
    ".git",
    ".codex-plugin",
    ".codex-tmp",
    ".tmp-vetrade-swap",
    ".wrangler",
    ".wrangler-ai-functions-build",
    ".openzeppelin",
    "build",
    "coverage",
    "deployments",
    "dist",
    "generated",
    "node_modules",
  ].includes(baseName);
}

function copyIntoSnapshot(sourcePath: string, destinationPath: string): void {
  const stats = fs.statSync(sourcePath);
  if (stats.isDirectory()) {
    fs.cpSync(sourcePath, destinationPath, {
      recursive: true,
      filter: (candidatePath) => !shouldSkipDuringSnapshot(candidatePath),
    });
    return;
  }

  ensureDirectory(path.dirname(destinationPath));
  fs.copyFileSync(sourcePath, destinationPath);
}

export function initializeMemoryRepo(targetPath: string, paths: RuntimePaths): string {
  ensureMemoryDirectories(paths);
  ensureMemPalaceConfig(paths);

  const repoRoot = findRepoRoot(targetPath);
  const manifest = loadRepoManifest(repoRoot) ?? createDefaultRepoManifest(repoRoot);
  const manifestPath = getRepoManifestPath(repoRoot);
  writeRepoManifest(repoRoot, manifest);
  ensureWingRegistration(paths, repoRoot, manifest);

  const messages = [
    `AI memory manifest is ready for ${repoRoot}.`,
    `Manifest: ${manifestPath}`,
    `Wing: ${manifest.wing}`,
    `Palace: ${paths.palacePath}`,
  ];

  if (!isMemPalaceInstalled(paths)) {
    messages.push(
      `MemPalace import is not ready yet. You need to install MemPalace for ${paths.pythonCommand} before you run ai-memory-mine or ai-memory-mcp-server.`,
    );
  }

  return messages.join("\n");
}

export function mineRepoManifestPaths(targetPath: string, paths: RuntimePaths): string {
  const repoRoot = findRepoRoot(targetPath);
  const manifest = loadRepoManifest(repoRoot);
  if (!manifest) {
    throw new Error(`Add ${paths.repoManifestName} to ${repoRoot} with ai-memory-init before you run ai-memory-mine.`);
  }

  if (!isMemPalaceInstalled(paths)) {
    throw new Error(`You need to install MemPalace for ${paths.pythonCommand} before you run ai-memory-mine.`);
  }

  ensureMemoryDirectories(paths);
  ensureMemPalaceConfig(paths);
  ensureWingRegistration(paths, repoRoot, manifest);

  const snapshotRoot = path.join(paths.manualStagingRoot, manifest.wing, "snapshot");
  fs.rmSync(snapshotRoot, { recursive: true, force: true });
  ensureDirectory(snapshotRoot);

  for (const relativePath of manifest.minePaths) {
    const sourcePath = path.resolve(repoRoot, relativePath);
    if (!fs.existsSync(sourcePath)) {
      continue;
    }

    if (relativePath === "." && fs.statSync(sourcePath).isDirectory()) {
      for (const childName of fs.readdirSync(sourcePath)) {
        if (shouldSkipDuringSnapshot(path.join(sourcePath, childName))) {
          continue;
        }
        copyIntoSnapshot(path.join(sourcePath, childName), path.join(snapshotRoot, childName));
      }
      continue;
    }

    copyIntoSnapshot(sourcePath, path.join(snapshotRoot, relativePath));
  }

  const initResult = runMemPalaceCommand(paths, "init", [snapshotRoot, "--yes"]);
  if (!initResult.ok) {
    throw new Error(formatMemPalaceFailure("Snapshot initialization", initResult, paths));
  }

  const mineResult = runMemPalaceCommand(paths, "mine", [snapshotRoot, "--wing", manifest.wing]);
  if (!mineResult.ok) {
    throw new Error(formatMemPalaceFailure("Manual mining", mineResult, paths));
  }

  return `Mined ${manifest.minePaths.join(", ")} into ${manifest.wing} from snapshot ${snapshotRoot}.`;
}

export function getDoctorReport(paths: RuntimePaths): DoctorReport {
  return {
    memoryRoot: paths.memoryRoot,
    memoryRootSource: paths.memoryRootSource,
    palacePath: paths.palacePath,
    mempalaceHome: paths.mempalaceHome,
    pythonCommand: paths.pythonCommand,
    mempalaceImportable: isMemPalaceInstalled(paths),
    palaceExists: fs.existsSync(paths.palacePath),
    usesSharedMount: paths.usesSharedMount,
    transcriptAutoMineEnabled: paths.transcriptAutoMineEnabled,
    transcriptAutoMineReason: paths.transcriptAutoMineReason,
    guardrails: paths.guardrails,
  };
}
