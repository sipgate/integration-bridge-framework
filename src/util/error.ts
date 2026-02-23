import { AxiosError, isAxiosError } from 'axios';
import {
  DELEGATE_TO_FRONTEND_CODE,
  IntegrationErrorType,
  ServerError,
} from '../models';
import { errorLogger, warnLogger } from './logger.util';

const STATUS_TO_ERROR_TYPE: Partial<Record<number, IntegrationErrorType>> = {
  401: IntegrationErrorType.INTEGRATION_REFRESH_ERROR,
  403: IntegrationErrorType.INTEGRATION_ERROR_FORBIDDEN,
  404: IntegrationErrorType.ENTITY_NOT_FOUND,
  409: IntegrationErrorType.ENTITY_ERROR_CONFLICT,
  502: IntegrationErrorType.INTEGRATION_ERROR_UNAVAILABLE,
  503: IntegrationErrorType.INTEGRATION_ERROR_UNAVAILABLE,
  504: IntegrationErrorType.INTEGRATION_ERROR_UNAVAILABLE,
};

function extractStatus(error: Error): number | undefined {
  if (isAxiosError(error)) {
    return error.response?.status ?? error.status;
  }
  if (error instanceof ServerError) {
    return error.status;
  }

  const err = error as Record<string, any>;
  if (err.status != null) {
    return typeof err.status === 'string'
      ? parseInt(err.status, 10)
      : err.status;
  }
  if (err.response?.status != null) {
    return err.response.status;
  }
  if (err.code != null) {
    const parsed = parseInt(err.code, 10);
    return isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

function formatErrorMessage(error: Error): string {
  if (isAxiosError(error) && error.response?.data) {
    return JSON.stringify(error.response.data);
  }
  return error.message;
}

export const throwAndDelegateError = (
  error: AxiosError | DelegateToFrontedError | ServerError | Error,
  source: string,
  apiKey: string | undefined,
  logMessage?: string,
  data?: object,
) => {
  if (error instanceof DelegateToFrontedError) {
    throw error;
  }

  const status = extractStatus(error);
  const errorMessage = formatErrorMessage(error);

  errorLogger(source, logMessage ?? errorMessage, apiKey, {
    ...(isAxiosError(error) && { data: error.response?.data }),
    error,
    stackTrace: error.stack,
    ...(logMessage && { message: errorMessage }),
    ...data,
  });

  if (status == null) {
    throw new ServerError(
      500,
      `An internal error occurred: ${logMessage ?? error.message}`,
    );
  }

  const errorType = STATUS_TO_ERROR_TYPE[status];

  if (errorType) {
    warnLogger(
      'throwAndDelegateError',
      `Delegating crm error to frontend with code ${DELEGATE_TO_FRONTEND_CODE} and type ${errorType}`,
      apiKey,
      logMessage,
    );
    throw new ServerError(DELEGATE_TO_FRONTEND_CODE, errorType);
  }

  throw new ServerError(status, `${source} (${errorMessage})`);
};

export class DelegateToFrontedError extends ServerError {
  errorType: IntegrationErrorType;

  constructor(errorType: IntegrationErrorType) {
    super(DELEGATE_TO_FRONTEND_CODE, errorType);

    this.errorType = errorType;
    this.name = 'DelegateToFrontedError';
  }
}
