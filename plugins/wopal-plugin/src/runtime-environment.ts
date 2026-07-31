import { existsSync, readFileSync } from "fs";
import { join } from "path";
import type { RuntimeContext } from "./runtime-context.js";

export type RuntimeEnvironment = Readonly<Record<string, string | undefined>>;

function loadEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};

  const values: Record<string, string> = {};
  let content: string;
  try {
    content = readFileSync(path, "utf-8");
  } catch {
    return values;
  }
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    if (!key.startsWith("WOPAL_")) continue;
    values[key] = trimmed
      .slice(separator + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
  return values;
}

export function loadRuntimeEnvironment(
  context: RuntimeContext,
  processEnvironment: NodeJS.ProcessEnv = process.env,
): RuntimeEnvironment {
  const homeEnvironment = loadEnvFile(join(context.wopalHome, ".env"));
  const spaceEnvironment = context.wopalSpaceRoot
    ? loadEnvFile(join(context.wopalSpaceRoot, ".wopal", ".env"))
    : {};
  return Object.freeze({
    ...homeEnvironment,
    ...spaceEnvironment,
    ...processEnvironment,
  });
}
