#!/usr/bin/env node
import { Command } from "commander";
import { loadEnvForSpace } from "./lib/env-loader.js";
import { Logger } from "./lib/logger.js";
import { checkInitialization } from "./lib/init-check.js";
import { handleCommandError } from "./lib/error-utils.js";
import { getPrimaryCommand } from "./argv.js";
import { tryRouteCli, getVersion } from "./route.js";
import { buildHelpText, buildHelpHeader } from "./lib/help-texts.js";
import { getConfig } from "./lib/config.js";
import {
  registerInitCommand,
  setLogger as setInitLogger,
} from "./commands/init.js";
import {
  registerSkillsCli,
  setLogger as setSkillsLogger,
} from "./commands/skills/index.js";
import { setLogger as setOpenclawUpdaterLogger } from "./scanner/openclaw-updater.js";
import { setLogger as setOpenclawWrapperLogger } from "./scanner/openclaw-wrapper.js";
import { registerSpaceCommand } from "./commands/space.js";

async function runCli(argv: string[] = process.argv): Promise<void> {
  if (await tryRouteCli(argv)) {
    return;
  }

  const program = new Command();
  const version = getVersion();

  program
    .name("wopal")
    .description("Universal toolbox for wopal agents")
    .version(version, "-v, --version", "Show version number")
    .option("-d, --debug", "Enable debug mode")
    .addHelpCommand(false)
    .hook("preAction", (thisCommand, actionCommand) => {
      const options = thisCommand.opts();
      const debug = options.debug || false;

      const config = getConfig(debug);
      const spacePath = config.getActiveSpacePath();
      loadEnvForSpace(debug, spacePath);

      const logger = new Logger(debug);
      setInitLogger(logger);
      setSkillsLogger(logger);
      setOpenclawUpdaterLogger(logger);
      setOpenclawWrapperLogger(logger);

      logger.log("Debug mode enabled");

      const commandName = actionCommand.name();
      if (commandName !== "init" && commandName !== "space") {
        try {
          checkInitialization();
        } catch (error) {
          handleCommandError(error);
        }
      }
    });

  program.addHelpText("before", () => {
    const config = getConfig();
    return buildHelpHeader(config.getActiveSpace());
  });

  program.addHelpText(
    "after",
    buildHelpText({
      examples: [
        "wopal init                    # Initialize workspace",
        "wopal space list              # List all spaces",
        "wopal skills list             # List all skills",
        "wopal skills --help           # Show skills help",
      ],
      notes: ["Run 'wopal <command> --help' for command details"],
    }),
  );

  registerInitCommand(program);
  registerSpaceCommand(program);

  const primary = getPrimaryCommand(argv);
  if (primary === null || primary === "skills") {
    registerSkillsCli(program);
  }

  await program.parseAsync(argv);
}

runCli().catch((error) => {
  console.error(error);
  process.exit(1);
});
