import { AxiosError } from 'axios';
import {
  DELEGATE_TO_FRONTEND_CODE,
  IntegrationErrorType,
  ServerError,
} from '../../models';
import { throwAndDelegateError } from './error';

jest.mock('../logger.util', () => ({
  errorLogger: jest.fn(),
  warnLogger: jest.fn(),
}));

import { errorLogger, warnLogger } from '../logger.util';
import { DelegateToFrontedError } from './delegate-to-frontend.error';

const mockedErrorLogger = errorLogger as jest.MockedFunction<
  typeof errorLogger
>;
const mockedWarnLogger = warnLogger as jest.MockedFunction<typeof warnLogger>;

const SOURCE = 'testSource';
const API_KEY = 'test-api-key';

beforeEach(() => {
  mockedErrorLogger.mockClear();
  mockedWarnLogger.mockClear();
});

describe('throwAndDelegateError', () => {
  describe('DelegateToFrontedError', () => {
    it('should re-throw DelegateToFrontedError as-is without logging', () => {
      const error = new DelegateToFrontedError(
        IntegrationErrorType.INTEGRATION_REFRESH_ERROR,
      );

      expect(() => throwAndDelegateError(error, SOURCE, API_KEY)).toThrow(
        error,
      );
      expect(mockedErrorLogger).not.toHaveBeenCalled();
      expect(mockedWarnLogger).not.toHaveBeenCalled();
    });
  });

  describe('AxiosError', () => {
    function createAxiosError(
      status: number | undefined,
      responseData?: unknown,
    ): AxiosError {
      const error = new AxiosError(
        `Request failed with status code ${status}`,
        status ? String(status) : 'ERR_NETWORK',
        undefined,
        undefined,
        status
          ? ({
              status,
              data: responseData ?? 'error',
              headers: {},
              statusText: 'Error',
              config: {} as any,
            } as any)
          : undefined,
      );
      return error;
    }

    it('should map 401 to INTEGRATION_UNAUTHORIZED_ERROR', () => {
      const error = createAxiosError(401);

      expect(() => throwAndDelegateError(error, SOURCE, API_KEY)).toThrow(
        expect.objectContaining({
          status: DELEGATE_TO_FRONTEND_CODE,
          message: IntegrationErrorType.INTEGRATION_UNAUTHORIZED_ERROR,
        }),
      );
    });

    it('should map 403 to INTEGRATION_ERROR_FORBIDDEN', () => {
      const error = createAxiosError(403);

      expect(() => throwAndDelegateError(error, SOURCE, API_KEY)).toThrow(
        expect.objectContaining({
          status: DELEGATE_TO_FRONTEND_CODE,
          message: IntegrationErrorType.INTEGRATION_ERROR_FORBIDDEN,
        }),
      );
    });

    it('should map 404 to ENTITY_NOT_FOUND', () => {
      const error = createAxiosError(404);

      expect(() => throwAndDelegateError(error, SOURCE, API_KEY)).toThrow(
        expect.objectContaining({
          status: DELEGATE_TO_FRONTEND_CODE,
          message: IntegrationErrorType.ENTITY_NOT_FOUND,
        }),
      );
    });

    it('should map 409 to ENTITY_ERROR_CONFLICT', () => {
      const error = createAxiosError(409);

      expect(() => throwAndDelegateError(error, SOURCE, API_KEY)).toThrow(
        expect.objectContaining({
          status: DELEGATE_TO_FRONTEND_CODE,
          message: IntegrationErrorType.ENTITY_ERROR_CONFLICT,
        }),
      );
    });

    it.each([502, 503, 504])(
      'should map %d to INTEGRATION_ERROR_UNAVAILABLE',
      (status) => {
        const error = createAxiosError(status);

        expect(() => throwAndDelegateError(error, SOURCE, API_KEY)).toThrow(
          expect.objectContaining({
            status: DELEGATE_TO_FRONTEND_CODE,
            message: IntegrationErrorType.INTEGRATION_ERROR_UNAVAILABLE,
          }),
        );
      },
    );

    it('should throw ServerError with the original status for unmapped status codes', () => {
      const error = createAxiosError(422);

      expect(() => throwAndDelegateError(error, SOURCE, API_KEY)).toThrow(
        expect.objectContaining({
          status: 422,
        }),
      );
    });

    it('should throw ServerError 500 for network errors (no response)', () => {
      const error = new AxiosError('Network Error', 'ERR_NETWORK');

      expect(() => throwAndDelegateError(error, SOURCE, API_KEY)).toThrow(
        expect.objectContaining({
          status: 500,
        }),
      );
    });
  });

  describe('ServerError', () => {
    it('should map ServerError with status 401 to INTEGRATION_UNAUTHORIZED_ERROR', () => {
      const error = new ServerError(401, 'Unauthorized');

      expect(() => throwAndDelegateError(error, SOURCE, API_KEY)).toThrow(
        expect.objectContaining({
          status: DELEGATE_TO_FRONTEND_CODE,
          message: IntegrationErrorType.INTEGRATION_UNAUTHORIZED_ERROR,
        }),
      );
    });

    it('should map ServerError with status 404 to ENTITY_NOT_FOUND', () => {
      const error = new ServerError(404, 'Not Found');

      expect(() => throwAndDelegateError(error, SOURCE, API_KEY)).toThrow(
        expect.objectContaining({
          status: DELEGATE_TO_FRONTEND_CODE,
          message: IntegrationErrorType.ENTITY_NOT_FOUND,
        }),
      );
    });

    it('should pass through unmapped ServerError status codes', () => {
      const error = new ServerError(418, "I'm a teapot");

      expect(() => throwAndDelegateError(error, SOURCE, API_KEY)).toThrow(
        expect.objectContaining({
          status: 418,
        }),
      );
    });
  });

  describe('plain objects with code property', () => {
    it('should parse numeric code "401" and map to unauthorized error', () => {
      const error = Object.assign(new Error('CRM error'), { code: '401' });

      expect(() => throwAndDelegateError(error, SOURCE, API_KEY)).toThrow(
        expect.objectContaining({
          status: DELEGATE_TO_FRONTEND_CODE,
          message: IntegrationErrorType.INTEGRATION_UNAUTHORIZED_ERROR,
        }),
      );
    });

    it('should parse numeric code "404" and map to not found', () => {
      const error = Object.assign(new Error('CRM error'), { code: '404' });

      expect(() => throwAndDelegateError(error, SOURCE, API_KEY)).toThrow(
        expect.objectContaining({
          status: DELEGATE_TO_FRONTEND_CODE,
          message: IntegrationErrorType.ENTITY_NOT_FOUND,
        }),
      );
    });

    it('should throw 500 for non-numeric code like "ENOTFOUND"', () => {
      const error = Object.assign(new Error('DNS error'), {
        code: 'ENOTFOUND',
      });

      expect(() => throwAndDelegateError(error, SOURCE, API_KEY)).toThrow(
        expect.objectContaining({
          status: 500,
        }),
      );
    });

    it('should extract status from plain object with numeric status', () => {
      const error = Object.assign(new Error('Bad request'), { status: 403 });

      expect(() => throwAndDelegateError(error, SOURCE, API_KEY)).toThrow(
        expect.objectContaining({
          status: DELEGATE_TO_FRONTEND_CODE,
          message: IntegrationErrorType.INTEGRATION_ERROR_FORBIDDEN,
        }),
      );
    });

    it('should extract status from plain object with string status', () => {
      const error = Object.assign(new Error('Bad request'), {
        status: '401',
      });

      expect(() => throwAndDelegateError(error, SOURCE, API_KEY)).toThrow(
        expect.objectContaining({
          status: DELEGATE_TO_FRONTEND_CODE,
          message: IntegrationErrorType.INTEGRATION_UNAUTHORIZED_ERROR,
        }),
      );
    });

    it('should extract status from response.status on plain object', () => {
      const error = Object.assign(new Error('Bad request'), {
        response: { status: 503 },
      });

      expect(() => throwAndDelegateError(error, SOURCE, API_KEY)).toThrow(
        expect.objectContaining({
          status: DELEGATE_TO_FRONTEND_CODE,
          message: IntegrationErrorType.INTEGRATION_ERROR_UNAVAILABLE,
        }),
      );
    });
  });

  describe('plain Error', () => {
    it('should throw ServerError 500 for a plain Error', () => {
      const error = new Error('Something went wrong');

      expect(() => throwAndDelegateError(error, SOURCE, API_KEY)).toThrow(
        expect.objectContaining({
          status: 500,
          message: expect.stringContaining('An internal error occurred'),
        }),
      );
    });
  });

  describe('logging', () => {
    it('should call errorLogger exactly once per error', () => {
      const error = new ServerError(401, 'Unauthorized');

      expect(() => throwAndDelegateError(error, SOURCE, API_KEY)).toThrow();
      expect(mockedErrorLogger).toHaveBeenCalledTimes(1);
    });

    it('should not call errorLogger for DelegateToFrontedError', () => {
      const error = new DelegateToFrontedError(
        IntegrationErrorType.INTEGRATION_REFRESH_ERROR,
      );

      expect(() => throwAndDelegateError(error, SOURCE, API_KEY)).toThrow();
      expect(mockedErrorLogger).not.toHaveBeenCalled();
    });

    it('should call warnLogger for delegated errors', () => {
      const error = new ServerError(401, 'Unauthorized');

      expect(() => throwAndDelegateError(error, SOURCE, API_KEY)).toThrow();
      expect(mockedWarnLogger).toHaveBeenCalledTimes(1);
      expect(mockedWarnLogger).toHaveBeenCalledWith(
        'throwAndDelegateError',
        expect.stringContaining('Delegating crm error to frontend'),
        API_KEY,
        undefined,
      );
    });

    it('should not call warnLogger for non-delegated errors (e.g. unmapped status)', () => {
      const error = new ServerError(418, "I'm a teapot");

      expect(() => throwAndDelegateError(error, SOURCE, API_KEY)).toThrow();
      expect(mockedWarnLogger).not.toHaveBeenCalled();
    });

    it('should use logMessage as primary message when provided', () => {
      const error = new ServerError(401, 'Unauthorized');
      const logMessage = 'Custom log message';

      expect(() =>
        throwAndDelegateError(error, SOURCE, API_KEY, logMessage),
      ).toThrow();
      expect(mockedErrorLogger).toHaveBeenCalledWith(
        SOURCE,
        logMessage,
        API_KEY,
        expect.objectContaining({
          message: 'Unauthorized',
        }),
      );
    });

    it('should use error message when logMessage is not provided', () => {
      const error = new ServerError(401, 'Unauthorized');

      expect(() => throwAndDelegateError(error, SOURCE, API_KEY)).toThrow();
      expect(mockedErrorLogger).toHaveBeenCalledWith(
        SOURCE,
        'Unauthorized',
        API_KEY,
        expect.not.objectContaining({
          message: expect.anything(),
        }),
      );
    });

    it('should spread data param into logging context', () => {
      const error = new ServerError(401, 'Unauthorized');
      const data = { customField: 'value', extra: 123 };

      expect(() =>
        throwAndDelegateError(error, SOURCE, API_KEY, undefined, data),
      ).toThrow();
      expect(mockedErrorLogger).toHaveBeenCalledWith(
        SOURCE,
        'Unauthorized',
        API_KEY,
        expect.objectContaining({
          customField: 'value',
          extra: 123,
        }),
      );
    });

    it('should include AxiosError response data in logging context', () => {
      const responseData = { detail: 'invalid token' };
      const error = new AxiosError(
        'Request failed',
        '401',
        undefined,
        undefined,
        {
          status: 401,
          data: responseData,
          headers: {},
          statusText: 'Unauthorized',
          config: {} as any,
        } as any,
      );

      expect(() => throwAndDelegateError(error, SOURCE, API_KEY)).toThrow();
      expect(mockedErrorLogger).toHaveBeenCalledWith(
        SOURCE,
        expect.any(String),
        API_KEY,
        expect.objectContaining({
          data: responseData,
        }),
      );
    });
  });
});
