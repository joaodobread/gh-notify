import { existsSync, readFileSync, mkdirSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export const CONFIG_DIR = join(homedir(), ".config", "github-notify");
export const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export type Backend = "gnome" | "kde";

export interface Config {
  token: string;
  backend: Backend;
  scriptPath: string;
}

export function loadConfig(): Config {
  if (!existsSync(CONFIG_FILE)) {
    throw new Error("NO_CONFIG");
  }
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, "utf8")) as Config;
  } catch {
    throw new Error("CORRUPTED_CONFIG");
  }
}

export function saveConfig(config: Config): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 });
}
