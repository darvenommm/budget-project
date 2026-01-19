export class AppError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = this.constructor.name;
  }

  toJSON(): { error: string; code: string; statusCode: number } {
    return {
      error: this.message,
      code: this.code,
      statusCode: this.statusCode,
    };
  }
}

export class NotFoundError extends AppError {
  constructor(code: string, message: string) {
    super(code, 404, message);
  }
}

export class ConflictError extends AppError {
  constructor(code: string, message: string) {
    super(code, 409, message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(code: string, message: string) {
    super(code, 401, message);
  }
}

export class ValidationError extends AppError {
  constructor(
    code: string,
    message: string,
    public details?: unknown,
  ) {
    super(code, 400, message);
  }

  override toJSON(): { error: string; code: string; statusCode: number; details?: unknown } {
    return {
      ...super.toJSON(),
      details: this.details,
    };
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(code: string, message: string) {
    super(code, 503, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(code: string, message: string) {
    super(code, 403, message);
  }
}
