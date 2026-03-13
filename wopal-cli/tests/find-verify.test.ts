import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProgramContext } from "../src/program/types.js";

const { parseDownloadSourceMock, downloadParsedSourceToInboxMock } = vi.hoisted(
  () => ({
    parseDownloadSourceMock: vi.fn(),
    downloadParsedSourceToInboxMock: vi.fn(),
  }),
);

vi.mock("../src/lib/download-skill.js", () => ({
  parseDownloadSource: parseDownloadSourceMock,
  downloadParsedSourceToInbox: downloadParsedSourceToInboxMock,
}));

import { verifySkills, verifyTopResults } from "../src/commands/skills/find.js";

function createContext(): ProgramContext {
  return {
    version: "test",
    debug: false,
    config: {} as ProgramContext["config"],
    output: {
      print: vi.fn(),
      println: vi.fn(),
    } as unknown as ProgramContext["output"],
  };
}

describe("verifySkills", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks downloadable results as verified", async () => {
    parseDownloadSourceMock.mockReturnValue({
      type: "well-known",
      source: "smithery.ai",
      skill: "smithery-ai-cli",
    });
    downloadParsedSourceToInboxMock.mockResolvedValue({
      success: ["smithery-ai-cli"],
      failed: [],
      warnings: [
        {
          code: "invalid-skill-format",
          message:
            "Warning: Invalid YAML in SKILL.md for skill 'smithery-ai-cli': bad frontmatter",
        },
      ],
    });

    const results = await verifySkills(
      [
        {
          id: "smithery.ai/smithery-ai-cli",
          name: "smithery-ai-cli",
          installs: 100,
          source: "smithery.ai",
        },
      ],
      createContext(),
    );

    expect(results[0]?.verification).toEqual({
      verified: true,
      warnings: [
        "Warning: Invalid YAML in SKILL.md for skill 'smithery-ai-cli': bad frontmatter",
      ],
    });
  });

  it("summarizes failed verification reason", async () => {
    parseDownloadSourceMock.mockReturnValue({
      type: "well-known",
      source: "smithery.ai",
      skill: "using-superpowers",
    });
    downloadParsedSourceToInboxMock.mockResolvedValue({
      success: [],
      failed: [
        {
          skill: "using-superpowers",
          error:
            "Skill 'using-superpowers' not found at 'smithery.ai'.\nAvailable skills:\n  - smithery-ai-cli",
        },
      ],
    });

    const results = await verifySkills(
      [
        {
          id: "smithery.ai/using-superpowers",
          name: "using-superpowers",
          installs: 20,
          source: "smithery.ai",
        },
      ],
      createContext(),
    );

    expect(results[0]?.verification).toEqual({
      verified: false,
      reason: "Skill 'using-superpowers' not found at 'smithery.ai'.",
    });
  });

  it("marks unsupported result format as unverified", async () => {
    parseDownloadSourceMock.mockReturnValue(null);

    const results = await verifySkills(
      [
        {
          id: "openakita/openakita/obra/superpowers@writing-skills",
          name: "obra/superpowers@writing-skills",
          installs: 1,
          source: "openakita/openakita",
        },
      ],
      createContext(),
    );

    expect(results[0]?.verification).toEqual({
      verified: false,
      reason: "Source format is not currently downloadable",
    });
    expect(downloadParsedSourceToInboxMock).not.toHaveBeenCalled();
  });

  it("verifies only the requested top results", async () => {
    parseDownloadSourceMock
      .mockReturnValueOnce({
        type: "well-known",
        source: "smithery.ai",
        skill: "skill-a",
      })
      .mockReturnValueOnce({
        type: "well-known",
        source: "smithery.ai",
        skill: "skill-b",
      });

    downloadParsedSourceToInboxMock
      .mockResolvedValueOnce({ success: ["skill-a"], failed: [] })
      .mockResolvedValueOnce({
        success: [],
        failed: [{ skill: "skill-b", error: "Not found" }],
      });

    const results = await verifyTopResults(
      [
        {
          id: "smithery.ai/skill-a",
          name: "skill-a",
          installs: 50,
          source: "smithery.ai",
        },
        {
          id: "smithery.ai/skill-b",
          name: "skill-b",
          installs: 40,
          source: "smithery.ai",
        },
        {
          id: "smithery.ai/skill-c",
          name: "skill-c",
          installs: 30,
          source: "smithery.ai",
        },
      ],
      2,
      createContext(),
    );

    expect(results[0]?.verification).toEqual({ verified: true });
    expect(results[1]?.verification).toEqual({
      verified: false,
      reason: "Not found",
    });
    expect(results[2]?.verification).toBeUndefined();
    expect(parseDownloadSourceMock).toHaveBeenCalledTimes(2);
    expect(downloadParsedSourceToInboxMock).toHaveBeenCalledTimes(2);
  });
});
