import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { createPluginRuntime } from "./index.js";
import { LLMClient } from "./llm-client.js";
import { EmbeddingClient } from "./memory/embedder.js";
import { getDefaultMemoryDbPath } from "./memory/store.js";
import { getSessionContextDir } from "./memory/session-context.js";

describe("plugin runtime isolation", () => {
  const keys = [
    "WOPAL_HOME",
    "WOPAL_LLM_BASE_URL",
    "WOPAL_LLM_API_KEY",
    "WOPAL_LLM_MODEL",
    "WOPAL_EMBEDDING_BASE_URL",
    "WOPAL_EMBEDDING_API_KEY",
    "WOPAL_EMBEDDING_MODEL",
  ] as const;
  const saved = new Map<string, string | undefined>();
  let root: string;

  beforeEach(() => {
    root = join(tmpdir(), `wopal-runtime-isolation-${crypto.randomUUID()}`);
    mkdirSync(root, { recursive: true });
    for (const key of keys) {
      saved.set(key, process.env[key]);
      delete process.env[key];
    }
    process.env.WOPAL_HOME = join(root, "home");
    mkdirSync(process.env.WOPAL_HOME, { recursive: true });
  });

  afterEach(() => {
    for (const key of keys) {
      const value = saved.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    saved.clear();
    rmSync(root, { recursive: true, force: true });
  });

  function createSpace(name: string, model: string) {
    const spaceRoot = join(root, name);
    mkdirSync(join(spaceRoot, ".wopal"), { recursive: true });
    writeFileSync(
      join(spaceRoot, ".wopal", ".env"),
      [
        "WOPAL_LLM_BASE_URL=http://llm.invalid",
        "WOPAL_LLM_API_KEY=test",
        `WOPAL_LLM_MODEL=${model}`,
        "WOPAL_EMBEDDING_BASE_URL=http://embedding.invalid",
        "WOPAL_EMBEDDING_API_KEY=test",
        `WOPAL_EMBEDDING_MODEL=${model}-embedding`,
      ].join("\n"),
    );
    return { directory: join(spaceRoot, "project"), wopalSpaceRoot: spaceRoot };
  }

  it("keeps roots, env, prompts, and clients isolated in any order", () => {
    const inputA = createSpace("a", "model-a");
    const inputB = createSpace("b", "model-b");

    const runtimeB = createPluginRuntime(inputB);
    const runtimeA = createPluginRuntime(inputA);
    const llmA = new LLMClient(runtimeA.env, runtimeA.loggers.core);
    const llmB = new LLMClient(runtimeB.env, runtimeB.loggers.core);
    const embeddingA = new EmbeddingClient(runtimeA.env, runtimeA.loggers.memory);
    const embeddingB = new EmbeddingClient(runtimeB.env, runtimeB.loggers.memory);

    expect(runtimeA.context.wopalSpaceRoot).toBe(inputA.wopalSpaceRoot);
    expect(runtimeB.context.wopalSpaceRoot).toBe(inputB.wopalSpaceRoot);
    expect(llmA.getModel()).toBe("model-a");
    expect(llmB.getModel()).toBe("model-b");
    expect(embeddingA.getModel()).toBe("model-a-embedding");
    expect(embeddingB.getModel()).toBe("model-b-embedding");
    expect(process.env.WOPAL_LLM_MODEL).toBeUndefined();
  });

  it("creates independent runtimes concurrently", async () => {
    const inputA = createSpace("a", "model-a");
    const inputB = createSpace("b", "model-b");

    const [runtimeA, runtimeB, runtimeGlobal] = await Promise.all([
      Promise.resolve().then(() => createPluginRuntime(inputA)),
      Promise.resolve().then(() => createPluginRuntime(inputB)),
      Promise.resolve().then(() => createPluginRuntime({ directory: root })),
    ]);

    expect(runtimeA.env.WOPAL_LLM_MODEL).toBe("model-a");
    expect(runtimeB.env.WOPAL_LLM_MODEL).toBe("model-b");
    expect(runtimeGlobal.env.WOPAL_LLM_MODEL).toBeUndefined();
    expect(runtimeGlobal.context.wopalSpaceRoot).toBeUndefined();
  });

  it("keeps memory storage under WOPAL_HOME", () => {
    const wopalHome = join(root, "home");
    expect(getDefaultMemoryDbPath(wopalHome)).toBe(join(wopalHome, "storage", "memory"));
    expect(getSessionContextDir(wopalHome)).toBe(join(wopalHome, "storage", "session_context"));
  });
});
