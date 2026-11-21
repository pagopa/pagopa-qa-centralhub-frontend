export const JIRA_BROWSE_BASE_URL = "https://pagopa.atlassian.net/browse";

const KEY = "[A-Z][A-Z0-9]+-\\d+";
const BARE_KEY = new RegExp(`^(${KEY})$`, "i");
const URL_KEY = new RegExp(`(?:/browse/|[?&]selectedIssue=)(${KEY})(?=$|[?#&/])`, "i");

/** Extracts an upper-case Jira issue key from a bare key or a Jira URL; null if none is found. */
export function parseJiraIssueKey(input: string | null | undefined): string | null {
  const value = input?.trim();
  if (!value) return null;
  const match = BARE_KEY.exec(value) ?? URL_KEY.exec(value);
  return match ? match[1].toUpperCase() : null;
}

export function buildJiraIssueUrl(key: string): string {
  return `${JIRA_BROWSE_BASE_URL}/${key}`;
}
