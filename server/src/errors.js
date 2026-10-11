export class AppError extends Error {
  constructor(message, { status = 500, code = 'INTERNAL_ERROR', retryable = false, details } = {}) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.retryable = retryable;
    this.details = details;
  }
}

export function validationError(message) {
  return new AppError(message, { status: 400, code: 'VALIDATION_ERROR' });
}

export function conflictError(message, code = 'CONFLICT') {
  return new AppError(message, { status: 409, code });
}

export function retryableError(message, code = 'RETRYABLE_ERROR') {
  return new AppError(message, { status: 503, code, retryable: true });
}
