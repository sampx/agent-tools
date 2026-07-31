import { describe, it, expect } from "vitest";
import path from "path";
import os from "os";
import { createRuntimeContext } from "./runtime-context.js";

describe("RuntimeContext", () => {
  const directory = path.join(os.tmpdir(), "runtime-ctx-test");

  it("uses the supplied WOPAL_HOME", () => {
    const ctx = createRuntimeContext({
      directory,
      wopalHome: "/custom/wopal-home",
    });
    expect(ctx.wopalHome).toBe("/custom/wopal-home");
  });

  it("falls back to ~/.wopal when WOPAL_HOME is omitted", () => {
    const ctx = createRuntimeContext({ directory });
    expect(ctx.wopalHome).toBe(path.join(os.homedir(), ".wopal"));
  });

  it("uses the PluginInput space root", () => {
    const ctx = createRuntimeContext({
      directory,
      wopalSpaceRoot: "/spaces/a",
    });
    expect(ctx.isWopalSpace).toBe(true);
    expect(ctx.wopalSpaceRoot).toBe("/spaces/a");
    expect(ctx.logDir).toBe(path.join("/spaces/a", ".wopal-space", "logs"));
  });

  it("represents a non-space invocation without a space root", () => {
    const ctx = createRuntimeContext({ directory, wopalHome: "/home/wopal" });
    expect(ctx.isWopalSpace).toBe(false);
    expect(ctx.wopalSpaceRoot).toBeUndefined();
    expect(ctx.logDir).toBe(path.join("/home/wopal", "logs"));
  });

  it("stores the provided directory", () => {
    const ctx = createRuntimeContext({ directory });
    expect(ctx.directory).toBe(directory);
  });

  it("keeps the same space root for a nested directory", () => {
    const subDir = path.join("/spaces/a", "projects", "ellamaka");
    const ctx = createRuntimeContext({
      directory: subDir,
      wopalSpaceRoot: "/spaces/a",
    });
    expect(ctx.isWopalSpace).toBe(true);
    expect(ctx.wopalSpaceRoot).toBe("/spaces/a");
    expect(ctx.directory).toBe(subDir);
  });

  it("returns an immutable context", () => {
    const ctx = createRuntimeContext({ directory });
    expect(Object.isFrozen(ctx)).toBe(true);
  });
});
