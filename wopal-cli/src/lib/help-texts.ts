import type { SpaceConfig } from "./config.js";

export const HELP_TEXTS = {
  descriptions: {
    inbox: "Manage skills in INBOX (downloaded skills pending review)",
    inboxList: "List all skills in INBOX",
    inboxShow: "Show details of a skill in INBOX",
    inboxRemove: "Remove a skill from INBOX",
    list: "List all installed skills with status indicators",
    scan: "Scan skills for security issues before installation",
    check: "Check for updates to installed skills",
    download:
      "Download skills to INBOX for security scanning before installation",
    install: "Install a skill from INBOX or local path",
    init: "Initialize workspace with skills directory structure",
  },

  sections: {
    sourceFormat: (formats: string[]): string => {
      const lines = formats.map((f) => `  ${f}`);
      return `\nSOURCE FORMAT:\n${lines.join("\n")}`;
    },

    examples: (examples: string[]): string => {
      const lines = examples.map((e) => `  ${e}`);
      return `\nEXAMPLES:\n${lines.join("\n")}`;
    },

    options: (options: string[]): string => {
      const lines = options.map((o) => `  ${o}`);
      return `\nOPTIONS:\n${lines.join("\n")}`;
    },

    notes: (notes: string[]): string => {
      const lines = notes.map((n) => `  - ${n}`);
      return `\nNOTES:\n${lines.join("\n")}`;
    },

    workflow: (steps: string[]): string => {
      const lines = steps.map((s, i) => `  ${i + 1}. ${s}`);
      return `\nWORKFLOW:\n${lines.join("\n")}`;
    },
  },

  errors: {
    missingArgument: (argName: string, command: string) =>
      `Missing required argument: ${argName}\nUse 'wopal ${command} --help' for usage information`,

    skillNotFound: (skillName: string) =>
      `Skill '${skillName}' not found\nUse 'wopal list' to see installed skills`,

    skillNotInInbox: (skillName: string) =>
      `Skill '${skillName}' not found in INBOX\nUse 'wopal inbox list' to see downloaded skills`,

    skillAlreadyExists: (skillName: string) =>
      `Skill '${skillName}' is already installed\nUse --force to overwrite`,

    invalidSource: (source: string) =>
      `Invalid source format: ${source}\nUse format: owner/repo@skill-name`,
  },

  statuses: {
    downloaded: "[Downloaded]",
    installed: "[Installed]",
    critical: "Critical",
    warning: "Warning",
    passed: "Passed",
  },

  messages: {
    skillRemoved: (skillName: string) =>
      `Skill '${skillName}' removed from INBOX`,

    skillInstalled: (skillName: string) =>
      `Skill '${skillName}' installed successfully`,

    skillDownloaded: (skillName: string, overwritten: boolean = false) =>
      `Downloaded skill '${skillName}' to INBOX${overwritten ? " (overwritten)" : ""}`,

    noSkillsFound: "No skills found",
    noUpdatesAvailable: "All skills are up to date",
    scanningAllSkills: "Scanning all skills in INBOX...",
    scanningSkill: (skillName: string) => `Scanning skill '${skillName}'...`,
  },
};

export function buildHelpText(
  sections: {
    sourceFormat?: string[];
    examples?: string[];
    options?: string[];
    notes?: string[];
    workflow?: string[];
  } = {},
): string {
  const parts: string[] = [];

  if (sections.sourceFormat?.length) {
    parts.push(HELP_TEXTS.sections.sourceFormat(sections.sourceFormat));
  }

  if (sections.examples?.length) {
    parts.push(HELP_TEXTS.sections.examples(sections.examples.slice(0, 5)));
  }

  if (sections.options?.length) {
    parts.push(HELP_TEXTS.sections.options(sections.options));
  }

  if (sections.notes?.length) {
    parts.push(HELP_TEXTS.sections.notes(sections.notes.slice(0, 4)));
  }

  if (sections.workflow?.length) {
    parts.push(HELP_TEXTS.sections.workflow(sections.workflow.slice(0, 5)));
  }

  return parts.join("\n");
}

export function buildHelpHeader(activeSpace?: SpaceConfig): string {
  if (!activeSpace) {
    return "\nACTIVE SPACE: (none)\n";
  }
  return `\nACTIVE SPACE: ${activeSpace.path}\n`;
}
