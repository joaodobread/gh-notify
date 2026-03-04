#!/usr/bin/env bun
/**
 * github-notify setup wizard
 * Saves config to ~/.config/github-notify/config.json
 */

import { homedir } from "os";
import { join } from "path";

import { BACKENDS, CONFIG_FILE, saveConfig } from "./shared";
import type { Config } from "./shared";

const SCRIPT_DIR = join(homedir(), ".local", "share", "github-notify");
const SCRIPT_FILE = join(SCRIPT_DIR, "github-notify.ts");

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  white: "\x1b[37m",
  bgBlue: "\x1b[44m",
  up: (n: number) => `\x1b[${n}A`,
  clearLine: "\x1b[2K\r",
};

function print(text: string) {
  process.stdout.write(text);
}
function println(text = "") {
  process.stdout.write(text + "\n");
}

function header() {
  println();
  println(`${C.bold}${C.white}  github-notify — setup wizard${C.reset}`);
  println(`${C.dim}  Configure your GitHub desktop notifications${C.reset}`);
  println();
}

function success(msg: string) {
  println(`  ${C.green}✓${C.reset}  ${msg}`);
}
function warn(msg: string) {
  println(`  ${C.yellow}!${C.reset}  ${msg}`);
}
function error(msg: string) {
  println(`  ${C.red}x${C.reset}  ${msg}`);
}
function label(msg: string) {
  println(`${C.bold}${C.cyan}  ${msg}${C.reset}`);
}

async function readLine(prompt: string): Promise<string> {
  print(`  ${C.bold}${prompt}${C.reset} `);
  const buf = Buffer.alloc(1024);
  let result = "";
  while (true) {
    const n = await new Promise<number>((res) =>
      process.stdin.once("data", (chunk: Buffer) => {
        chunk.copy(buf);
        res(chunk.length);
      }),
    );
    const chunk = buf.subarray(0, n).toString("utf8");
    if (chunk.includes("\n") || chunk.includes("\r")) {
      result += chunk.replace(/[\r\n]/g, "");
      break;
    }
    result += chunk;
  }
  return result.trim();
}

async function readSecret(prompt: string): Promise<string> {
  print(`  ${C.bold}${prompt}${C.reset} `);

  const sttyOff = Bun.spawn(["stty", "-echo"], { stdin: "inherit" });
  await sttyOff.exited;

  const value = await readLine("");

  const sttyOn = Bun.spawn(["stty", "echo"], { stdin: "inherit" });
  await sttyOn.exited;

  println();
  return value.trim();
}

async function selectMenu<
  T extends {
    id: string;
    label: string;
    description: string;
    available: boolean;
  },
>(prompt: string, items: T[]): Promise<T> {
  println(`  ${C.bold}${prompt}${C.reset}`);
  println();

  let selected = 0;

  for (let i = 0; i < items.length; i++) {
    if (items[i]!.available) {
      selected = i;
      break;
    }
  }

  function render(redraw = false) {
    if (redraw) print(C.up(items.length + 1) + C.clearLine);

    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      const active = i === selected;
      const dimmed = !item.available;

      const cursor = active ? `${C.cyan}>${C.reset}` : " ";
      const nameText = dimmed
        ? `${C.dim}${item.label}${C.reset}`
        : active
          ? `${C.bold}${C.white}${item.label}${C.reset}`
          : item.label;
      const descText = dimmed
        ? `${C.dim}${item.description} (coming soon)${C.reset}`
        : `${C.dim}${item.description}${C.reset}`;

      println(`  ${cursor} ${nameText}  ${descText}`);
    }
    println();
  }

  process.stdin.setRawMode(true);
  process.stdin.resume();

  render();

  return new Promise((resolve) => {
    process.stdin.on("data", function handler(key: Buffer) {
      const k = key.toString();

      if (k === "\x1b[A" || k === "k") {
        do {
          selected = (selected - 1 + items.length) % items.length;
        } while (!items[selected]!.available);
        render(true);
      } else if (k === "\x1b[B" || k === "j") {
        do {
          selected = (selected + 1) % items.length;
        } while (!items[selected]!.available);
        render(true);
      } else if (k === "\r" || k === "\n") {
        process.stdin.removeListener("data", handler);
        process.stdin.setRawMode(false);
        process.stdin.pause();
        resolve(items[selected]!);
      } else if (k === "\x03") {
        process.stdin.setRawMode(false);
        println("\n  Aborted.");
        process.exit(0);
      }
    });
  });
}

async function validateToken(token: string): Promise<{ login: string } | null> {
  try {
    const res = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { login: string };
    return { login: data.login };
  } catch {
    return null;
  }
}

function autostartInstructions(config: Config) {
  const desktopEntry = `[Desktop Entry]
Type=Application
Name=github-notify
Comment=GitHub desktop notifications
Exec=bun run ${config.scriptPath}
X-GNOME-Autostart-enabled=true
`;

  const autostartDir = join(homedir(), ".config", "autostart");
  const autostartFile = join(autostartDir, "github-notify.desktop");

  println();
  println(
    `${C.bold}${C.white}  ── Autostart on login ──────────────────────────────${C.reset}`,
  );
  println();
  label("Option 1 — XDG autostart (recommended, works on GNOME & KDE)");
  println();
  println(`  Run these commands:`);
  println();
  println(`${C.dim}  mkdir -p ${autostartDir}${C.reset}`);
  println(`${C.dim}  cat > ${autostartFile} << 'EOF'${C.reset}`);
  println(`${C.cyan}${desktopEntry.trim()}${C.reset}`);
  println(`${C.dim}  EOF${C.reset}`);
  println();
  label(
    "Option 2 — systemd user service (more robust, survives session restarts)",
  );
  println();

  const serviceDir = join(homedir(), ".config", "systemd", "user");
  const serviceFile = join(serviceDir, "github-notify.service");

  const bunPath = Bun.which("bun") ?? "/usr/local/bin/bun";

  const serviceContent = `[Unit]
Description=GitHub desktop notifications
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=${bunPath} run ${config.scriptPath}
Restart=on-failure
RestartSec=15
Environment=DBUS_SESSION_BUS_ADDRESS=%I

[Install]
WantedBy=default.target
`;

  println(`${C.dim}  mkdir -p ${serviceDir}${C.reset}`);
  println(`${C.dim}  cat > ${serviceFile} << 'EOF'${C.reset}`);
  println(`${C.cyan}${serviceContent.trim()}${C.reset}`);
  println(`${C.dim}  EOF${C.reset}`);
  println();
  println(`  Then enable and start it:`);
  println();
  println(`${C.dim}  systemctl --user daemon-reload${C.reset}`);
  println(`${C.dim}  systemctl --user enable --now github-notify${C.reset}`);
  println();
  println(`  Check logs:`);
  println(`${C.dim}  journalctl --user -u github-notify -f${C.reset}`);
  println();
}

async function main() {
  process.stdin.resume();

  header();

  label("Step 1/2 — GitHub Personal Access Token");
  println(`  ${C.dim}Create one at: github.com/settings/tokens${C.reset}`);
  println(
    `  ${C.dim}Required scope: notifications  (+ repo for private repos)${C.reset}`,
  );
  println();

  let token = "";
  let login = "";

  while (true) {
    token = await readSecret("Paste your token:");

    if (!token) {
      warn("Token cannot be empty. Try again.");
      continue;
    }

    print(`  Validating token...`);
    const user = await validateToken(token);

    if (!user) {
      print(C.clearLine);
      error("Invalid token or no network access. Try again.");
      continue;
    }

    print(C.clearLine);
    login = user.login;
    success(`Authenticated as ${C.bold}${login}${C.reset}`);
    break;
  }

  println();

  label("Step 2/2 — Notification backend");

  const backend = await selectMenu(
    "Select your desktop environment:",
    BACKENDS,
  );

  success(`Selected: ${C.bold}${backend.label}${C.reset}`);
  println();

  const config: Config = {
    token,
    backend: backend.id as Config["backend"],
    scriptPath: SCRIPT_FILE,
  };

  saveConfig(config);
  success(`Config saved to ${C.dim}${CONFIG_FILE}${C.reset}`);

  println();
  println(
    `${C.bold}${C.white}  ── Setup complete ──────────────────────────────────${C.reset}`,
  );
  println();
  println(`  Run now:`);
  println(`  ${C.cyan}bun run ${SCRIPT_FILE}${C.reset}`);

  autostartInstructions(config);
}

export function setup() {
  main().catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  });
}
