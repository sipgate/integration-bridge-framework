import { AxiosError, isAxiosError } from 'axios';
import {
  DELEGATE_TO_FRONTEND_CODE,
  IntegrationErrorType,
  ServerError,
} from '../models';
import { errorLogger, warnLogger } from './logger.util';

export const throwAndDelegateError = (
  error: AxiosError | DelegateToFrontedError | ServerError | Error,
  source: string,
  apiKey: string | undefined,
  logMessage?: string,
) => {
  const errorMessage = isAxiosError(error)
    ? error.response?.data
      ? JSON.stringify(error.response?.data)
      : error.message
    : error.message;

  if (logMessage) {
    errorLogger(source, logMessage, apiKey, {
      message: errorMessage,
      error,
      stackTrace: error.stack,
    });
  } else {
    errorLogger(source, errorMessage, apiKey, {
      error,
      stackTrace: error.stack,
    });
  }

  const err = error as any;
  let errorType: IntegrationErrorType | string | undefined = undefined;

  if (error instanceof DelegateToFrontedError) {
    const delegateToFrontedError = error as DelegateToFrontedError;
    errorType = delegateToFrontedError.errorType;
  } else {
    if (err.code || err.status || err.response?.status) {
      const status =
        err.status ||
        err.response?.status ||
        (err.code ? parseInt(err.code) : 500);

      switch (status) {
        case 401:
          errorType = IntegrationErrorType.INTEGRATION_REFRESH_ERROR;
          break;
        case 403:
          errorType = IntegrationErrorType.INTEGRATION_ERROR_FORBIDDEN;
          break;
        case 404:
          errorType = IntegrationErrorType.ENTITY_NOT_FOUND;
          break;
        case 409:
          errorType = IntegrationErrorType.ENTITY_ERROR_CONFLICT;
          break;
        case 502:
        case 503:
        case 504:
          errorType = IntegrationErrorType.INTEGRATION_ERROR_UNAVAILABLE;
          break;
        default:
          throw new ServerError(status, `${source} (${errorMessage})`);
      }
    }
  }

  if (errorType !== undefined) {
    warnLogger(
      'throwAndDelegateError',
      `Delegating crm error to frontend with code ${DELEGATE_TO_FRONTEND_CODE} and type ${errorType}`,
      apiKey,
    );
    throw new ServerError(DELEGATE_TO_FRONTEND_CODE, errorType);
  }
  throw new ServerError(500, 'An internal error occurred');
};

export class DelegateToFrontedError extends ServerError {
  errorType: IntegrationErrorType;
  constructor(errorType: IntegrationErrorType) {
    super(DELEGATE_TO_FRONTEND_CODE, errorType);

    this.errorType = errorType;
    this.name = 'DelegateToFrontedError';
  }
}
