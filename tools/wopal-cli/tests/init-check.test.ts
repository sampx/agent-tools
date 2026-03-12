import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { checkInitialization } from "../src/utils/init-check.js";
import { CommandError } from "../src/utils/error-utils.js";
import { resetConfigForTest } from "../src/utils/config.js";

describe("init-check", () => {
  beforeEach(() => {
    resetConfigForTest();
    delete process.env.WOPAL_SETTINGS_PATH;
    delete process.env.WOPAL_SKILLS_IOCDB_DIR;
    delete process.env.WOPAL_SKILLS_DIR;
    delete process.env.WOPAL_SKILLS_INBOX_DIR;
  });

  afterEach(() => {
    resetConfigForTest();
  });

  describe("checkInitialization", () => {
    it("should throw CommandError when initialization is incomplete", async () => {
      const { ConfigService } = await import("../src/utils/config.js");
      new ConfigService();

      expect(() => checkInitialization()).toThrow(CommandError);
    });

    it("should throw either NOT_INITIALIZED or IOC_DATABASE_NOT_FOUND", async () => {
      const { ConfigService } = await import("../src/utils/config.js");
      new ConfigService();

      try {
        checkInitialization();
      } catch (error) {
        expect(error).toBeInstanceOf(CommandError);
        const code = (error as CommandError).code;
        expect(["NOT_INITIALIZED", "IOC_DATABASE_NOT_FOUND"]).toContain(code);
      }
    });

    it("should provide helpful suggestion in error", async () => {
      const { ConfigService } = await import("../src/utils/config.js");
      new ConfigService();

      try {
        checkInitialization();
      } catch (error) {
        const suggestion = (error as CommandError).suggestion;
        expect(suggestion).toBeDefined();
        expect(suggestion!.length).toBeGreaterThan(0);
      }
    });
  });
});
