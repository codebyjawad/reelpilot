export class HttpError extends Error {
  statusCode: number;
  details?: any;

  constructor(message: string, statusCode: number = 500, details?: any) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class BadRequestError extends HttpError {
  constructor(message: string = 'Bad Request', details?: any) {
    super(message, 400, details);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message: string = 'Unauthorized', details?: any) {
    super(message, 401, details);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message: string = 'Forbidden', details?: any) {
    super(message, 403, details);
  }
}

export class NotFoundError extends HttpError {
  constructor(message: string = 'Not Found', details?: any) {
    super(message, 404, details);
  }
}

export class ConflictError extends HttpError {
  constructor(message: string = 'Conflict', details?: any) {
    super(message, 409, details);
  }
}

export class FacebookApiError extends HttpError {
  fbResponseCode?: number;
  fbMessage?: string;

  constructor(
    message: string = 'Facebook API Error',
    fbResponseCode?: number,
    fbMessage?: string
  ) {
    super(message, 502);
    this.name = 'FacebookApiError';
    this.fbResponseCode = fbResponseCode;
    this.fbMessage = fbMessage;
  }
}
