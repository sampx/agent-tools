import { existsSync, rmSync, readdirSync, statSync, readFileSync } from "fs";
import { join } from "path";
import { Command } from "commander";
import {
  getInboxDir,
  getDirectorySize,
  formatSize,
  buildDirectoryTree,
} from "../../lib/inbox-utils.js";
import { Logger } from "../../lib/logger.js";
import { buildHelpText } from "../../lib/help-texts.js";

let logger: Logger;

export function setLogger(l: Logger): void {
  logger = l;
}

export function registerInboxCommand(program: Command): void {
  const inbox = program
    .command("inbox")
    .description("Manage skills in INBOX (downloaded but not yet installed)");

  const listCommand = inbox
    .command("list")
    .description("List all skills in INBOX")
    .option("--json", "Output in JSON format")
    .action(async (options: { json?: boolean }) => {
      await listInboxSkills(options.json);
    });

  listCommand.addHelpText(
    "after",
    buildHelpText({
      examples: [
        "wopal inbox list                # List all INBOX skills",
        "wopal inbox list --json         # JSON output",
      ],
      notes: [
        "Skills stored in INBOX after download",
        "Use 'wopal inbox show' to view details",
      ],
    }),
  );

  const showCommand = inbox
    .command("show <skill>")
    .description(
      "Show skill details (SKILL.md content and directory structure)",
    )
    .action(async (skillName: string) => {
      await showInboxSkill(skillName);
    });

  showCommand.addHelpText(
    "after",
    buildHelpText({
      examples: [
        "wopal inbox show my-skill       # Show skill details",
      ],
      notes: [
        "Displays SKILL.md content and directory structure",
      ],
    }),
  );

  const removeCommand = inbox
    .command("remove <skill>")
    .description("Remove a single skill from INBOX")
    .action(async (skillName: string) => {
      await removeInboxSkill(skillName);
    });

  removeCommand.addHelpText(
    "after",
    buildHelpText({
      examples: [
        "wopal inbox remove my-skill     # Remove from INBOX",
      ],
      notes: [
        "Permanently deletes the skill from INBOX",
      ],
    }),
  );

  inbox.addHelpText(
    "after",
    buildHelpText({
      examples: [
        "wopal inbox list                # List INBOX skills",
        "wopal inbox show my-skill       # Show skill details",
        "wopal inbox remove my-skill     # Remove from INBOX",
      ],
      workflow: [
        "Download: wopal skills download <source>",
        "Review: wopal inbox show <skill-name>",
        "Scan: wopal skills scan <skill-name>",
        "Install: wopal skills install <skill-name>",
      ],
    }),
  );
}

async function listInboxSkills(jsonOutput: boolean = false): Promise<void> {
  const inboxDir = getInboxDir();
  logger?.log(`Listing INBOX skills from: ${inboxDir}`);

  if (!existsSync(inboxDir)) {
    if (jsonOutput) {
      console.log(JSON.stringify({ success: true, data: [] }, null, 2));
    } else {
      console.log("INBOX is empty");
    }
    return;
  }

  const entries = existsSync(inboxDir) ? readdirSync(inboxDir) : [];
  const skills = entries.filter((entry: string) => {
    return statSync(join(inboxDir, entry)).isDirectory();
  });

  if (skills.length === 0) {
    if (jsonOutput) {
      console.log(JSON.stringify({ success: true, data: [] }, null, 2));
    } else {
      console.log("INBOX is empty");
    }
    return;
  }

  const skillList = skills.map((skill: string) => {
    const skillPath = join(inboxDir, skill);
    const size = getDirectorySize(skillPath);
    return {
      name: skill,
      size: formatSize(size),
      path: skillPath,
    };
  });

  if (jsonOutput) {
    console.log(JSON.stringify({ success: true, data: skillList }, null, 2));
  } else {
    console.log("Skills in INBOX:\n");
    for (const skill of skillList) {
      console.log(`  ${skill.name} (${skill.size})`);
    }
  }
}

async function showInboxSkill(skillName: string): Promise<void> {
  const inboxDir = getInboxDir();
  const skillDir = join(inboxDir, skillName);
  const skillMdPath = join(skillDir, "SKILL.md");

  logger?.log(`Showing skill: ${skillName} at ${skillDir}`);

  if (!existsSync(skillDir)) {
    console.error(`Error: Skill '${skillName}' not found in INBOX`);
    process.exit(1);
  }

  if (!existsSync(skillMdPath)) {
    console.warn("Warning: Invalid skill directory (missing SKILL.md)");
    return;
  }

  const content = readFileSync(skillMdPath, "utf-8");
  console.log(content);

  console.log("\nDirectory Structure:");
  const tree = buildDirectoryTree(skillDir);
  console.log(tree);
}

async function removeInboxSkill(skillName: string): Promise<void> {
  const inboxDir = getInboxDir();
  const skillDir = join(inboxDir, skillName);

  logger?.log(`Removing skill: ${skillName} from ${skillDir}`);

  if (!existsSync(skillDir)) {
    console.error(`Error: Skill '${skillName}' not found in INBOX`);
    process.exit(1);
  }

  rmSync(skillDir, { recursive: true, force: true });
  console.log(`Skill '${skillName}' removed from INBOX`);
}
