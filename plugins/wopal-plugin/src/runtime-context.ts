import { homedir } from "os";
import { join } from "path";

export interface RuntimeContext {
  readonly wopalHome: string;
  readonly directory: string;
  readonly isWopalSpace: boolean;
  readonly wopalSpaceRoot?: string;
  readonly logDir: string;
}

export interface RuntimeContextInput {
  directory: string;
  wopalHome?: string;
  wopalSpaceRoot?: string;
}

export function createRuntimeContext(input: RuntimeContextInput): RuntimeContext {
  const wopalHome = input.wopalHome ?? join(homedir(), ".wopal");
  const context: RuntimeContext = {
    wopalHome,
    directory: input.directory,
    isWopalSpace: input.wopalSpaceRoot !== undefined,
    logDir: input.wopalSpaceRoot
      ? join(input.wopalSpaceRoot, ".wopal-space", "logs")
      : join(wopalHome, "logs"),
    ...(input.wopalSpaceRoot !== undefined
      ? { wopalSpaceRoot: input.wopalSpaceRoot }
      : {}),
  };
  return Object.freeze(context);
}
