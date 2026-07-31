import { afterEach, describe, expect, it } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { createRuntimeContext } from "./runtime-context.js";
import { loadRuntimeEnvironment } from "./runtime-environment.js";

describe("loadRuntimeEnvironment", () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) {
      rmSync(root, { recursive: true, force: true });
    }
  });

  function fixture(): { wopalHome: string; spaceRoot: string } {
    const root = join(tmpdir(), `wopal-runtime-env-${crypto.randomUUID()}`);
    const wopalHome = join(root, "home");
    const spaceRoot = join(root, "space");
    mkdirSync(join(spaceRoot, ".wopal"), { recursive: true });
    mkdirSync(wopalHome, { recursive: true });
    roots.push(root);
    return { wopalHome, spaceRoot };
  }

  it("merges process, space, and home values in priority order", () => {
    const { wopalHome, spaceRoot } = fixture();
    writeFileSync(join(wopalHome, ".env"), "WOPAL_SOURCE=home\nWOPAL_HOME_ONLY=yes\n");
    writeFileSync(join(spaceRoot, ".wopal", ".env"), "WOPAL_SOURCE=space\nWOPAL_SPACE_ONLY=yes\n");
    const context = createRuntimeContext({ directory: spaceRoot, wopalHome, wopalSpaceRoot: spaceRoot });

    const env = loadRuntimeEnvironment(context, { WOPAL_SOURCE: "process" });

    expect(env.WOPAL_SOURCE).toBe("process");
    expect(env.WOPAL_HOME_ONLY).toBe("yes");
    expect(env.WOPAL_SPACE_ONLY).toBe("yes");
    expect(Object.isFrozen(env)).toBe(true);
  });

  it("does not load space values for a non-space invocation", () => {
    const { wopalHome, spaceRoot } = fixture();
    writeFileSync(join(wopalHome, ".env"), "WOPAL_SOURCE=home\n");
    writeFileSync(join(spaceRoot, ".wopal", ".env"), "WOPAL_SOURCE=space\n");
    const context = createRuntimeContext({ directory: spaceRoot, wopalHome });

    expect(loadRuntimeEnvironment(context, {}).WOPAL_SOURCE).toBe("home");
  });

  it("does not mutate the supplied process environment", () => {
    const { wopalHome } = fixture();
    writeFileSync(join(wopalHome, ".env"), "WOPAL_FROM_FILE=yes\n");
    const baseline: Record<string, string | undefined> = { WOPAL_EXISTING: "yes" };
    const context = createRuntimeContext({ directory: wopalHome, wopalHome });

    loadRuntimeEnvironment(context, baseline);

    expect(baseline).toEqual({ WOPAL_EXISTING: "yes" });
  });
});
