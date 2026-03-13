import { Command } from "commander";
import { getConfig } from "../lib/config.js";
import { Logger } from "../lib/logger.js";
import { resolve } from "path";
import { homedir } from "os";
import { existsSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { buildHelpText } from "../lib/help-texts.js";

let logger: Logger;

export function setLogger(l: Logger): void {
  logger = l;
}

export function registerInitCommand(program: Command): void {
  const command = program
    .command("init [space-name] [space-dir]")
    .description("Initialize a new wopal workspace")
    .action((spaceName?: string, spaceDir?: string) => {
      let finalName = "main";
      let finalDir = process.cwd();

      if (spaceName && spaceDir) {
        finalName = spaceName;
        finalDir = spaceDir;
      } else if (spaceName && !spaceDir) {
        if (
          spaceName === "." ||
          spaceName.startsWith("/") ||
          spaceName.startsWith("~") ||
          spaceName.startsWith("./") ||
          spaceName.startsWith("../")
        ) {
          finalDir = spaceName;
        } else {
          finalName = spaceName;
        }
      }

      const expandedDir = resolve(
        process.cwd(),
        finalDir.replace(/^~(?=$|\/|\\)/, homedir()),
      );

      logger.info(`Initializing workspace [${finalName}] at: ${expandedDir}`);

      try {
        const configService = getConfig();
        configService.addSpace(finalName, expandedDir);

        const wopalGlobalEnv = join(homedir(), ".wopal", ".env");
        if (!existsSync(join(homedir(), ".wopal"))) {
          mkdirSync(join(homedir(), ".wopal"), { recursive: true });
        }
        if (!existsSync(wopalGlobalEnv)) {
          writeFileSync(wopalGlobalEnv, "", "utf-8");
        }

        const spaceEnv = join(expandedDir, ".env");
        if (!existsSync(spaceEnv)) {
          if (!existsSync(expandedDir)) {
            mkdirSync(expandedDir, { recursive: true });
          }
          writeFileSync(spaceEnv, "", "utf-8");
        }

        console.log(`Initialized workspace [${finalName}]`);
        console.log();
        console.log("Configuration:");
        console.log(`  Space: ${expandedDir}`);
        console.log(`  Config: ~/.wopal/config/settings.jsonc`);
        console.log();
        console.log("Next steps:");
        console.log("  Download a skill:");
        console.log("    wopal skills download owner/repo@skill-name");
        console.log("  List downloaded skills:");
        console.log("    wopal skills inbox list");
      } catch (error) {
        let errMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error: ${errMessage}`);
        logger.error(`Init failed: ${errMessage}`);
        process.exit(1);
      }
    });

  command.addHelpText(
    "after",
    buildHelpText({
      examples: [
        "wopal init                    # Initialize current directory as 'main'",
        "wopal init my-project         # Initialize with custom name",
        "wopal init . /path/to/ws      # Initialize specific directory",
        "wopal init ~/my-workspace     # Initialize using home path",
      ],
      notes: [
        "Creates .env file in workspace directory",
        "Creates ~/.wopal/.env for global settings",
        "Supports ~ expansion for home directory",
      ],
    }),
  );
}
