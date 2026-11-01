import { type ArgumentsHost, BadRequestException, HttpException, Logger } from '@nestjs/common';
import { UnavailableError } from '../../../src/server/common/errors/domain-error';
import { ApiExceptionFilter } from '../../../src/server/common/filters/api-exception.filter';

function capture(exception: unknown): { status: number; body: unknown } {
  const result = { status: 0, body: undefined as unknown };
  const res = {
    status(code: number) {
      result.status = code;
      return res;
    },
    json(body: unknown) {
      result.body = body;
    },
  };
  const host = { switchToHttp: () => ({ getResponse: () => res }) } as unknown as ArgumentsHost;
  new ApiExceptionFilter().catch(exception, host);
  return result;
}

describe('ApiExceptionFilter', () => {
  let errorLog: ReturnType<typeof vi.spyOn>;
  let warnLog: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorLog = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    warnLog = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('maps unexpected errors to 500 INTERNAL_ERROR without leaking internals', () => {
    const { status, body } = capture(new Error('database password is hunter2'));
    expect(status).toBe(500);
    expect(body).toEqual({ error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error' } });
    expect(JSON.stringify(body)).not.toContain('hunter2');
    expect(errorLog).toHaveBeenCalled();
  });

  it('maps non-Error throws to 500', () => {
    expect(capture('boom').status).toBe(500);
  });

  it('logs 503 domain errors as warnings and omits empty details', () => {
    const { status, body } = capture(new UnavailableError('SCALE_UNAVAILABLE', 'Scale offline'));
    expect(status).toBe(503);
    expect(body).toEqual({ error: { code: 'SCALE_UNAVAILABLE', message: 'Scale offline' } });
    expect(warnLog).toHaveBeenCalledWith('SCALE_UNAVAILABLE: Scale offline');
  });

  it('joins validation message arrays', () => {
    const { status, body } = capture(new BadRequestException(['a is required', 'b is invalid']));
    expect(status).toBe(400);
    expect(body).toEqual({
      error: { code: 'VALIDATION_FAILED', message: 'a is required; b is invalid' },
    });
  });

  it('uses string responses and a generic code for unmapped statuses', () => {
    const { status, body } = capture(new HttpException('I am a teapot', 418));
    expect(status).toBe(418);
    expect(body).toEqual({ error: { code: 'HTTP_418', message: 'I am a teapot' } });
  });

  it('falls back to the exception message when the response has none', () => {
    const { body } = capture(new HttpException({ statusCode: 409 }, 409));
    expect(body).toEqual({ error: { code: 'HTTP_409', message: 'Http Exception' } });
  });
});
