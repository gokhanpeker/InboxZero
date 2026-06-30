export type JobSummary = {
  id: number;
  status: string;
  total_items: number;
  created_at: string;
  queued: number;
  processing: number;
  done: number;
  failed: number;
};

export type JobCreateResponse = {
  id: number;
  status: string;
};

export type ItemResponse = {
  id: number;
  job_id: number;
  input_text: string;
  status: string;
  attempts: number;
  category: string | null;
  priority: string | null;
  sentiment: string | null;
  summary: string | null;
  suggested_reply: string | null;
  error: string | null;
  updated_at: string;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
};
