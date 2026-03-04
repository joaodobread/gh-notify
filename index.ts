#!/usr/bin/env bun
import { loadConfig } from "./src/shared/config";
import { setup } from "./src/setup";
import { notify } from "./src/github-notify";

const cmd = process.argv[2] ?? "run";

switch (cmd) {
  case "run":
  case "notify":
    try {
      const config = loadConfig();
      notify(config);
    } catch {
      console.log("No config found. Running setup wizard...\n");
      setup();
    }
    break;
  case "setup":
    setup();
    break;
  default:
    console.error(`Unknown command: ${cmd}`);
    console.error("Usage: github-notify <run|setup>");
    process.exit(1);
}
