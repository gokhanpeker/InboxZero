import { FALLBACK_ERROR, NETWORK_ERROR, SESSION_EXPIRED } from "@/lib/error-messages";

const ERROR_CODE_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: SESSION_EXPIRED,
  VALIDATION_ERROR: "Please check your input and try again.",
  NOT_FOUND: "The requested resource was not found.",
  CONFLICT: "This action conflicts with current state.",
  RATE_LIMIT_EXCEEDED: "Too many requests. Please wait and try again.",
  INTERNAL_ERROR: FALLBACK_ERROR,
};

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly requestId?: string;

  constructor(message: string, code: string, status: number, requestId?: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.requestId = requestId;
  }
}

export function getDisplayMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  return FALLBACK_ERROR;
}

export function mapErrorCode(code: string, fallbackMessage: string): string {
  return ERROR_CODE_MESSAGES[code] ?? fallbackMessage;
}

export function isNetworkError(error: unknown): boolean {
  return error instanceof ApiError && error.code === "NETWORK_ERROR";
}

export { NETWORK_ERROR };
