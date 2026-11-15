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

// Round 121 (review R1.2): the dungeon's routes ask which contract the client speaks. The web client names it on
// the map read, a move, a reset and a site start; a page from before this contract (or one that names none) is told
// to reload. Raise the number when the dungeon's contract changes in a way an older page cannot play by.
export const CLIENT_CONTRACT = 121;
export const OUTDATED_CLIENT = 'This page is older than the server. Open Settings and tap "Reload the page".';
export function requireClient(value) {
  if (!(Number(value) >= CLIENT_CONTRACT)) throw new AppError(OUTDATED_CLIENT, { status: 426, code: 'CLIENT_OUTDATED' });
}
