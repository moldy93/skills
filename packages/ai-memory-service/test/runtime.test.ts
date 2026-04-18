import assert from "node:assert/strict";
import test from "node:test";
import { resolveGuardrails, resolveRuntimePaths } from "../src/index.ts";

test("AI_MEMORY_ROOT wins over all other path inputs", () => {
  const paths = resolveRuntimePaths(
    {
      AI_MEMORY_ROOT: "/tmp/custom-ai-memory",
      AI_MEMORY_MDATA_ROOT: "/tmp/ignored-mdata",
    },
    {
      existsSync: () => true,
      homeDir: "/tmp/home",
      platform: "darwin",
    },
  );

  assert.equal(paths.memoryRoot, "/tmp/custom-ai-memory");
  assert.equal(paths.memoryRootSource, "env:AI_MEMORY_ROOT");
});

test("/Volumes/mdata/ai-memory is selected when present", () => {
  const paths = resolveRuntimePaths(
    {},
    {
      existsSync: (targetPath) => targetPath === "/Volumes/mdata/ai-memory",
      homeDir: "/tmp/home",
      platform: "darwin",
    },
  );

  assert.equal(paths.memoryRoot, "/Volumes/mdata/ai-memory");
  assert.equal(paths.memoryRootSource, "shared-mount");
  assert.equal(paths.usesSharedMount, true);
});

test("macOS fallback uses Application Support when shared mount is absent", () => {
  const paths = resolveRuntimePaths(
    {},
    {
      existsSync: () => false,
      homeDir: "/tmp/home",
      platform: "darwin",
    },
  );

  assert.equal(paths.memoryRoot, "/tmp/home/Library/Application Support/ai-memory");
  assert.equal(paths.memoryRootSource, "macos-home");
});

test("Apple Silicon guardrails default HNSW threads to 1 and honor overrides", () => {
  const defaultGuardrails = resolveGuardrails({}, "darwin", "arm64");
  assert.equal(defaultGuardrails.ortDisableCoreMl, "1");
  assert.equal(defaultGuardrails.chromaHnswNumThreads, "1");
  assert.equal(defaultGuardrails.defaultedChromaThreads, true);

  const overriddenGuardrails = resolveGuardrails(
    {
      CHROMA_HNSW_NUM_THREADS: "4",
      ORT_DISABLE_COREML: "0",
    },
    "darwin",
    "arm64",
  );
  assert.equal(overriddenGuardrails.chromaHnswNumThreads, "4");
  assert.equal(overriddenGuardrails.ortDisableCoreMl, "0");
  assert.equal(overriddenGuardrails.defaultedChromaThreads, false);
});
