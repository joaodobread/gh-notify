#!/usr/bin/env bun
/**
 * github-notify — Poll GitHub notifications every 30s and fire desktop alerts.
 *
 * First run the setup wizard:
 *   bun run setup.ts
 *
 * Then run this script:
 *   bun run github-notify.ts
 *
 * Or use the path printed by the wizard and add it to autostart.
 */

import type { Config, GithubNotification } from "./shared";
import {
  GITHUB_ICON_URL,
  ICON_PATH,
  POLL_INTERVAL_MS,
  REASON_LABEL,
  subjectLabel,
} from "./shared";

async function downloadIcon(): Promise<void> {
  try {
    const file = Bun.file(ICON_PATH);
    if (await file.exists()) return;
    const res = await fetch(GITHUB_ICON_URL);
    if (!res.ok) return;
    await Bun.write(ICON_PATH, res);
    console.log(`[icon] Cached to ${ICON_PATH}`);
  } catch {
    // non-fatal
  }
}

async function notifyGnome(summary: string, body: string): Promise<void> {
  const proc = Bun.spawn(
    [
      "notify-send",
      "--app-name=GitHub",
      `--icon=${ICON_PATH}`,
      "--urgency=normal",
      "--expire-time=8000",
      summary,
      body,
    ],
    { stderr: "pipe" },
  );
  await proc.exited;
  if (proc.exitCode !== 0) {
    const err = await new Response(proc.stderr).text();
    console.error("[notify-send] error:", err.trim());
  }
}

async function notifyKde(summary: string, body: string): Promise<void> {
  const proc = Bun.spawn(
    [
      "kdialog",
      "--passivepopup",
      `${summary}\n${body}`,
      "8",
      "--title",
      "GitHub",
      "--icon",
      ICON_PATH,
    ],
    { stderr: "pipe" },
  );
  await proc.exited;
  if (proc.exitCode !== 0) {
    const err = await new Response(proc.stderr).text();
    console.error("[kdialog] error:", err.trim());
  }
}

async function sendNotification(
  backend: Config["backend"],
  summary: string,
  body: string,
): Promise<void> {
  switch (backend) {
    case "gnome":
      return notifyGnome(summary, body);
    case "kde":
      return notifyKde(summary, body);
    default:
      console.warn(
        `[notify] Unknown backend "${backend}", falling back to gnome`,
      );
      return notifyGnome(summary, body);
  }
}

async function fetchUnreadNotifications(
  token: string,
  since: string,
): Promise<{ notifications: GithubNotification[]; pollInterval: number }> {
  const res = await fetch(`https://api.github.com/notifications?`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!res.ok) {
    throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
  }

  const serverInterval = parseInt(res.headers.get("X-Poll-Interval") ?? "0");
  const pollInterval = Math.max(POLL_INTERVAL_MS, serverInterval * 1000);

  if (res.status === 304) return { notifications: [], pollInterval };

  const notifications = (await res.json()) as GithubNotification[];
  return { notifications, pollInterval };
}

async function markThreadRead(token: string, threadId: string): Promise<void> {
  const res = await fetch(
    `https://api.github.com/notifications/threads/${threadId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );
  if (!res.ok && res.status !== 205) {
    console.warn(`[mark-read] thread ${threadId} → HTTP ${res.status}`);
  }
}

async function poll(
  config: Config,
  since: string,
): Promise<{ nextSince: string; nextDelay: number }> {
  const now = new Date().toISOString();

  try {
    const { notifications, pollInterval } = await fetchUnreadNotifications(
      config.token,
      since,
    );

    if (notifications.length === 0) {
      console.log(`[${new Date().toLocaleTimeString()}] No new notifications.`);
      return { nextSince: since, nextDelay: pollInterval };
    }

    console.log(
      `[${new Date().toLocaleTimeString()}] ${notifications.length} new notification(s):`,
    );

    for (const n of notifications) {
      const repo = n.repository.full_name;
      const type = subjectLabel(n.subject.type);
      const reason = REASON_LABEL[n.reason] ?? n.reason;

      const summary = `GitHub — ${repo}`;
      const body = `${type}: ${n.subject.title}\n${reason}`;

      console.log(`  - ${summary} | ${body.replace("\n", " | ")}`);

      await sendNotification(config.backend, summary, body);
      // await markThreadRead(config.token, n.id);
    }

    return { nextSince: now, nextDelay: pollInterval };
  } catch (err) {
    console.error("[poll] Error:", err instanceof Error ? err.message : err);
    return { nextSince: since, nextDelay: POLL_INTERVAL_MS };
  }
}

async function main(config: Config) {
  console.log("github-notify started");
  console.log(`  Backend : ${config.backend}`);
  console.log(`  Interval: ${POLL_INTERVAL_MS / 1000}s  (Ctrl-C to stop)\n`);

  await downloadIcon();

  let since = new Date(Date.now() - 60_000).toISOString();
  let nextDelay = POLL_INTERVAL_MS;

  while (true) {
    const result = await poll(config, since);
    since = result.nextSince;
    nextDelay = result.nextDelay;
    await Bun.sleep(nextDelay);
  }
}

export function notify(config: Config) {
  main(config);
}
