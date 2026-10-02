export class ApplicationError extends Error {
  constructor(public code: string, message: string, public status = 400, public retryable = false) {
    super(message);
  }
}
export function safeError(error: unknown): ApplicationError {
  return error instanceof ApplicationError ? error : new ApplicationError(
    "INTERNAL_ERROR", "Не удалось завершить операцию. Повторите попытку.", 500, true,
  );
}
