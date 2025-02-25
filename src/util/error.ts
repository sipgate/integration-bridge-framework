import { AxiosError, isAxiosError } from 'axios';
import {
  DELEGATE_TO_FRONTEND_CODE,
  IntegrationErrorType,
  ServerError,
} from '../models';
import { errorLogger } from './logger.util';

export const throwAndDelegateError = (
  error: AxiosError | DelegateToFrontedError | ServerError | Error,
  source: string,
  apiKey: string | undefined,
  logMessage?: string,
) => {
  // if already dedicated FrontendError, just forward it
  if (error instanceof DelegateToFrontedError) {
    throw error;
  }

  let errorType: IntegrationErrorType | string | undefined = undefined;
  let status: number | string | undefined = 500;

  // Extract the error information from the correct location
  if (isAxiosError(error)) {
    status = error.code;

    errorLogger(source, error.message, apiKey, {
      data: error.response?.data,
      error,
      stackTrace: error.stack,
      message: logMessage,
    });
  }

  if (error instanceof ServerError) {
    status = error.status;

    errorLogger(source, error.message, apiKey, {
      error,
      stackTrace: error.stack,
      message: logMessage,
    });
  }

  // Try to interpret the status code and map it to a IntegrationErrorType
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
      // No error code found, resorting to internal server error
      throw new ServerError(
        500,
        `An internal error occurred: ${logMessage ?? error.message}`,
      );
  }

  throw new ServerError(DELEGATE_TO_FRONTEND_CODE, errorType);
};

export class DelegateToFrontedError extends ServerError {
  errorType: IntegrationErrorType;

  constructor(errorType: IntegrationErrorType) {
    super(DELEGATE_TO_FRONTEND_CODE, errorType);

    this.errorType = errorType;
    this.name = 'DelegateToFrontedError';
  }
}
