export type Severity = "info" | "warning" | "critical";

export interface InboxItem {
  id: string;
  title: string;
  body: string;
  link: string | null;
  severity: Severity;
  type: string;
  created_at: string;
  read_at: string | null;
  auto_read: boolean;
}

export interface InboxPage {
  items: InboxItem[];
  next_cursor: string | null;
}

export interface InboxSummary {
  unread: number;
  total: number;
  max_unread_severity: Severity | null;
}

export type BellState = "empty" | "read" | "unread";
