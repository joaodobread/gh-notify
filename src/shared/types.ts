export interface GithubNotification {
  id: string;
  reason: string;
  unread: boolean;
  updated_at: string;
  subject: {
    title: string;
    type: string;
    url: string | null;
    latest_comment_url: string | null;
  };
  repository: {
    full_name: string;
    html_url: string;
  };
}

export function subjectLabel(type: string): string {
  switch (type) {
    case "PullRequest": return "PR";
    case "Issue":       return "Issue";
    case "Release":     return "Release";
    case "Commit":      return "Commit";
    case "Discussion":  return "Discussion";
    default:            return type;
  }
}
