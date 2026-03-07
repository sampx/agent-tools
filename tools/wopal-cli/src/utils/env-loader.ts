import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import dotenv from "dotenv";

function expandHomeDir(path: string): string {
  return path.replace(/^~(?=$|\/|\\)/, homedir());
}

export function loadEnv(debug: boolean = false): void {
  const cwdEnvPath = join(process.cwd(), ".env");
  const globalEnvPath = join(homedir(), ".wopal", ".env");

  if (existsSync(cwdEnvPath)) {
    const result = dotenv.config({ path: cwdEnvPath });
    if (result.error) {
      console.error(`Failed to load .env from ${cwdEnvPath}:`, result.error);
    }
  } else if (existsSync(globalEnvPath)) {
    const result = dotenv.config({ path: globalEnvPath });
    if (result.error) {
      console.error(`Failed to load .env from ${globalEnvPath}:`, result.error);
    }
  }

  for (const key of Object.keys(process.env)) {
    const value = process.env[key];
    if (value && value.includes("~")) {
      process.env[key] = expandHomeDir(value);
    }
  }
}
