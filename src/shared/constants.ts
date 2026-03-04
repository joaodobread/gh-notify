export const POLL_INTERVAL_MS = 30_000;
export const GITHUB_ICON_URL = "https://github.githubassets.com/favicons/favicon.png";
export const ICON_PATH = "/tmp/github-notify-icon.png";

export const REASON_LABEL: Record<string, string> = {
  assign:           "You were assigned",
  author:           "You authored this thread",
  comment:          "New comment",
  ci_activity:      "CI activity",
  invitation:       "Repository invitation",
  manual:           "Subscribed manually",
  mention:          "You were mentioned",
  review_requested: "Review requested",
  security_alert:   "Security alert",
  state_change:     "State changed",
  subscribed:       "Subscribed",
  team_mention:     "Team mentioned",
};

export const BACKENDS: { id: string; label: string; description: string; available: boolean }[] = [
  { id: "gnome", label: "GNOME (notify-send)", description: "Ubuntu, Fedora GNOME, Pop!_OS, etc.", available: true },
  { id: "kde", label: "KDE (kdialog)", description: "Kubuntu, KDE Neon, openSUSE KDE, etc.", available: false },
];
