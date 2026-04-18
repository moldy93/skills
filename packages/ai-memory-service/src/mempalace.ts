import { spawnSync } from "node:child_process";
import type { MemoryCommandResult, RuntimePaths } from "./types.ts";

function buildMemPalaceEnv(paths: RuntimePaths, env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const nextEnv: NodeJS.ProcessEnv = {
    ...env,
    PYTHONWARNINGS: env.PYTHONWARNINGS ?? "ignore",
  };

  if (!nextEnv.ORT_DISABLE_COREML && paths.guardrails.ortDisableCoreMl) {
    nextEnv.ORT_DISABLE_COREML = paths.guardrails.ortDisableCoreMl;
  }

  if (!nextEnv.CHROMA_HNSW_NUM_THREADS && paths.guardrails.chromaHnswNumThreads) {
    nextEnv.CHROMA_HNSW_NUM_THREADS = paths.guardrails.chromaHnswNumThreads;
  }

  return nextEnv;
}

function runPython(paths: RuntimePaths, argumentsList: readonly string[]): MemoryCommandResult {
  const result = spawnSync(paths.pythonCommand, argumentsList, {
    encoding: "utf8",
    env: buildMemPalaceEnv(paths),
    maxBuffer: 20 * 1024 * 1024,
  });

  return {
    ok: result.status === 0,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    code: result.status,
    signal: result.signal,
    error: result.error?.message,
  };
}

export function isMemPalaceInstalled(paths: RuntimePaths): boolean {
  return runPython(paths, ["-c", "import mempalace"]).ok;
}

export function runMemPalaceCommand(
  paths: RuntimePaths,
  command: string,
  args: readonly string[] = [],
): MemoryCommandResult {
  return runPython(paths, ["-m", "mempalace", "--palace", paths.palacePath, command, ...args]);
}

export function formatMemPalaceFailure(action: string, result: MemoryCommandResult, paths: RuntimePaths): string {
  const detail =
    result.stderr.trim() ||
    result.stdout.trim() ||
    result.error ||
    result.signal ||
    (result.code === null ? "unknown exit" : `exit ${result.code}`);

  if (/No module named mempalace/i.test(detail)) {
    return `${action} needs attention. You need to install MemPalace for ${paths.pythonCommand} and retry.`;
  }

  if (result.signal || result.code === 139) {
    return `${action} crashed in native MemPalace code. You need to run \`${paths.pythonCommand} -m mempalace --palace ${paths.palacePath} repair\` and retry.`;
  }

  return `${action} needs attention: ${detail}.`;
}
