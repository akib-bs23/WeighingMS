import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import type { ApiErrorBody } from '../../../shared/contracts/errors';
import { DomainError } from '../errors/domain-error';

const HTTP_CODES: Partial<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: 'VALIDATION_FAILED',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.METHOD_NOT_ALLOWED]: 'METHOD_NOT_ALLOWED',
};

/** Maps every thrown error to the single API error format; never leaks internals on 500. */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const { status, body } = this.toBody(exception);
    if (status >= 500 && !(exception instanceof DomainError)) {
      this.logger.error(
        'Unexpected error',
        exception instanceof Error ? exception.stack : exception,
      );
    } else if (status >= 500) {
      this.logger.warn(`${body.error.code}: ${body.error.message}`);
    }
    res.status(status).json(body);
  }

  private toBody(exception: unknown): { status: number; body: ApiErrorBody } {
    if (exception instanceof DomainError) {
      const error: ApiErrorBody['error'] = { code: exception.code, message: exception.message };
      if (exception.details) error.details = exception.details;
      return { status: exception.httpStatus, body: { error } };
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const raw =
        typeof response === 'object' ? (response as { message?: unknown }).message : response;
      const message = Array.isArray(raw)
        ? raw.join('; ')
        : typeof raw === 'string'
          ? raw
          : exception.message;
      return {
        status,
        body: { error: { code: HTTP_CODES[status] ?? `HTTP_${status}`, message } },
      };
    }
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: { error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error' } },
    };
  }
}
