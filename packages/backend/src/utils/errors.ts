import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(404, message);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, message);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(409, message);
    this.name = 'ConflictError';
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly fields?: Record<string, string[]>,
  ) {
    super(422, message);
    this.name = 'ValidationError';
  }
}

/**
 * Fastify global error handler.
 * Maps AppError subclasses to proper HTTP responses.
 */
export function errorHandler(
  error: FastifyError | AppError | Error,
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: error.name,
      message: error.message,
      statusCode: error.statusCode,
    });
  }

  // Fastify validation errors (from JSON schema)
  if ('validation' in error && error.validation) {
    return reply.status(400).send({
      error: 'ValidationError',
      message: error.message,
      statusCode: 400,
    });
  }

  // Unexpected errors — log and return generic 500
  console.error('[error]', error);
  return reply.status(500).send({
    error: 'InternalServerError',
    message: 'An unexpected error occurred',
    statusCode: 500,
  });
}
