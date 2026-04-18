import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureDirectory } from "./storage.ts";
import type { RuntimePaths } from "./types.ts";

function resolveBundledSkillSource(explicitPath?: string): string {
  const modulePath = fileURLToPath(import.meta.url);
  const packageRoot = path.resolve(path.dirname(modulePath), "..");
  const repoRoot = path.resolve(packageRoot, "../..");
  const candidates = [
    explicitPath,
    process.env.AI_MEMORY_SKILL_SOURCE,
    path.join(repoRoot, "skills", "mempalace-shared-memory"),
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (fs.existsSync(path.join(resolved, "SKILL.md"))) {
      return resolved;
    }
  }

  throw new Error(
    "OpenClaw skill source is missing. You need to point AI_MEMORY_SKILL_SOURCE or --skill-source to a mempalace-shared-memory skill directory.",
  );
}

export function bootstrapOpenClaw(paths: RuntimePaths, explicitSkillSource?: string): string {
  const sourceDirectory = resolveBundledSkillSource(explicitSkillSource);
  const targetDirectory = path.join(paths.openclawSkillsRoot, "mempalace-shared-memory");

  ensureDirectory(paths.openclawSkillsRoot);
  fs.rmSync(targetDirectory, { recursive: true, force: true });
  fs.cpSync(sourceDirectory, targetDirectory, { recursive: true });

  return [
    "OpenClaw AI memory bootstrap is ready.",
    `Installed skill: ${targetDirectory}`,
    "Next step: start a new OpenClaw session so the skill is loaded.",
  ].join("\n");
}
