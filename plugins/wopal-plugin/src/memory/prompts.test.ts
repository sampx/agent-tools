import { afterEach, describe, expect, it } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { createRuntimeContext } from "../runtime-context.js";
import { createMemoryPrompts } from "./prompts.js";

describe("createMemoryPrompts", () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  });

  it("binds prompt resolution to the invocation context", () => {
    const root = join(tmpdir(), `wopal-prompts-${crypto.randomUUID()}`);
    const home = join(root, "home");
    const spaceA = join(root, "a");
    const spaceB = join(root, "b");
    roots.push(root);
    for (const directory of [join(home, "prompts"), join(spaceA, ".wopal", "prompts"), join(spaceB, ".wopal", "prompts")]) {
      mkdirSync(directory, { recursive: true });
    }
    writeFileSync(join(home, "prompts", "title.md"), "home");
    writeFileSync(join(spaceA, ".wopal", "prompts", "title.md"), "space-a");
    writeFileSync(join(spaceB, ".wopal", "prompts", "title.md"), "space-b");

    const promptsA = createMemoryPrompts(createRuntimeContext({ directory: spaceA, wopalHome: home, wopalSpaceRoot: spaceA }), {});
    const promptsB = createMemoryPrompts(createRuntimeContext({ directory: spaceB, wopalHome: home, wopalSpaceRoot: spaceB }), {});
    const promptsGlobal = createMemoryPrompts(createRuntimeContext({ directory: root, wopalHome: home }), {});

    expect(promptsA.loadTitlePrompt()).toBe("space-a");
    expect(promptsB.loadTitlePrompt()).toBe("space-b");
    expect(promptsGlobal.loadTitlePrompt()).toBe("home");
  });
});
