export type Note = {
  id: string;
  title: string;
  content: string;
  summary?: string | null;
  tags: string[];
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  role: string;
  content: string;
  sessionId: string;
  createdAt: string;
};

export type AutomationTask = {
  id: string;
  title: string;
  description?: string | null;
  cronExpr: string;
  enabled: boolean;
  lastRunAt?: string | null;
};

export type UserFile = {
  id: string;
  fileName: string;
  summary?: string | null;
  createdAt: string;
};
