import { spawnSync } from "child_process";
import { Command } from "commander";
import { Logger } from "../../lib/logger.js";
import { buildHelpText } from "../../lib/help-texts.js";

let logger: Logger;

export function setLogger(l: Logger): void {
  logger = l;
}

export function registerPassthroughCommand(program: Command): void {
  const command = program
    .command("find <query>")
    .description("Search for skills (via Skills CLI)")
    .action(async (query: string) => {
      await passthroughFind(query);
    });

  command.addHelpText(
    "after",
    buildHelpText({
      examples: [
        "wopal skills find \"web scraping\"   # Search for skills",
        "wopal skills find openspec         # Search by keyword",
      ],
      notes: [
        "Passes through to Skills CLI (npx skills find)",
        "Requires network connection",
      ],
    }),
  );
}

async function passthroughFind(query: string): Promise<void> {
  logger?.log(`Passthrough find: ${query}`);

  const args = ["-y", "skills", "find", query];

  const result = spawnSync("npx", args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.error) {
    console.error("Error: Skills CLI execution failed");
    logger?.error(`Skills CLI error: ${result.error}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error("Error: Skills CLI command failed");
    process.exit(result.status || 1);
  }
}
