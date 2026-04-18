import fs from "node:fs";
import path from "node:path";
import { REPO_MANIFEST_NAME } from "./runtime.ts";
import type { RepoMemoryManifest } from "./types.ts";

function pathExists(targetPath: string): boolean {
  return fs.existsSync(targetPath);
}

function pickDefaultMinePaths(repoRoot: string): string[] {
  const preferredPaths = ["docs", "src", "README.md"].filter((relativePath) =>
    pathExists(path.join(repoRoot, relativePath)),
  );
  return preferredPaths.length > 0 ? preferredPaths : ["."];
}

export function slugifyWingName(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_");

  return `wing_${normalized || "general"}`;
}

export function findRepoRoot(startDir: string): string {
  let current = path.resolve(startDir);
  let fallbackWithPackage: string | undefined;

  while (true) {
    if (pathExists(path.join(current, ".git")) || pathExists(path.join(current, REPO_MANIFEST_NAME))) {
      return current;
    }

    if (!fallbackWithPackage && pathExists(path.join(current, "package.json"))) {
      fallbackWithPackage = current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  return fallbackWithPackage ?? path.resolve(startDir);
}

export function getRepoManifestPath(repoRoot: string): string {
  return path.join(repoRoot, REPO_MANIFEST_NAME);
}

export function loadRepoManifest(repoRoot: string): RepoMemoryManifest | undefined {
  const manifestPath = getRepoManifestPath(repoRoot);
  if (!pathExists(manifestPath)) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as Partial<RepoMemoryManifest>;
    if (
      parsed.enabled !== true ||
      typeof parsed.wing !== "string" ||
      typeof parsed.project !== "string" ||
      !Array.isArray(parsed.minePaths)
    ) {
      return undefined;
    }

    const minePaths = parsed.minePaths.filter((value): value is string => typeof value === "string" && value.length > 0);
    if (minePaths.length === 0) {
      return undefined;
    }

    return {
      enabled: true,
      wing: parsed.wing,
      project: parsed.project,
      minePaths,
    };
  } catch {
    return undefined;
  }
}

export function createDefaultRepoManifest(repoRoot: string): RepoMemoryManifest {
  const repoName = path.basename(repoRoot);

  return {
    enabled: true,
    wing: slugifyWingName(repoName),
    project: repoName,
    minePaths: pickDefaultMinePaths(repoRoot),
  };
}

export function writeRepoManifest(repoRoot: string, manifest: RepoMemoryManifest): string {
  const manifestPath = getRepoManifestPath(repoRoot);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifestPath;
}
