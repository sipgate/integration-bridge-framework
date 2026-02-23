import { AxiosError, isAxiosError } from 'axios';
import {
  DELEGATE_TO_FRONTEND_CODE,
  IntegrationErrorType,
  ServerError,
} from '../../models';
import { errorLogger, warnLogger } from '../logger.util';
import { DelegateToFrontedError } from './delegate-to-frontend.error';

/**
 * Maps CRM HTTP status codes to semantic error types that the frontend
 * can act on (e.g. trigger re-auth on 401, show "not found" on 404).
 * Unmapped status codes are passed through as-is.
 */
const STATUS_TO_ERROR_TYPE: Partial<Record<number, IntegrationErrorType>> = {
  401: IntegrationErrorType.INTEGRATION_UNAUTHORIZED_ERROR,
  403: IntegrationErrorType.INTEGRATION_ERROR_FORBIDDEN,
  404: IntegrationErrorType.ENTITY_NOT_FOUND,
  409: IntegrationErrorType.ENTITY_ERROR_CONFLICT,
  502: IntegrationErrorType.INTEGRATION_ERROR_UNAVAILABLE,
  503: IntegrationErrorType.INTEGRATION_ERROR_UNAVAILABLE,
  504: IntegrationErrorType.INTEGRATION_ERROR_UNAVAILABLE,
};

/**
 * Extracts an HTTP status code from various error shapes thrown by CRM adapters.
 * Adapters may throw AxiosErrors, ServerErrors, or plain objects with
 * `.status`, `.response.status`, or `.code` — this normalises them all to a number.
 */
const extractStatus = (error: Error): number | undefined => {
  if (isAxiosError(error)) {
    return error.response?.status ?? error.status;
  }
  if (error instanceof ServerError) {
    return error.status;
  }

  // Fallback for non-standard error objects from CRM SDKs
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
};

/** Prefers the CRM's response body (AxiosError) over the generic error message. */
const formatErrorMessage = (error: Error): string => {
  if (isAxiosError(error) && error.response?.data) {
    return JSON.stringify(error.response.data);
  }
  return error.message;
};

/**
 * Central error handler for calls from bridge.
 *
 * Logs the error, then maps the HTTP status to a semantic IntegrationErrorType
 * and throws a ServerError with status 452 (DELEGATE_TO_FRONTEND_CODE) so the
 * frontend can show an appropriate message. Unmapped status codes are re-thrown
 * as-is; errors without any status become a generic 500.
 */
export const throwAndDelegateError = (
  error: AxiosError | DelegateToFrontedError | ServerError | Error,
  source: string,
  apiKey: string | undefined,
  logMessage?: string,
  data?: object,
) => {
  // Already processed by an inner bridge call — re-throw without double-logging
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

  // No recognisable status → treat as internal server error
  if (status == null) {
    throw new ServerError(
      500,
      `An internal error occurred: ${logMessage ?? error.message}`,
    );
  }

  // Known status → delegate to frontend with a semantic error type
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

  // Unknown status (e.g. 422, 429) → pass through to the caller
  throw new ServerError(status, `${source} (${errorMessage})`);
};
