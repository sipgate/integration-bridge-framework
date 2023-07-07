import axios, { AxiosError } from "axios";
import {
  DELEGATE_TO_FRONTEND_CODE,
  IntegrationErrorType,
  ServerError,
} from "../models";
import { errorLogger } from "./logger.util";

export const throwAndDelegateError = (
  error: AxiosError | DelegateToFrontedError | ServerError | Error,
  source: string,
  apiKey: string | undefined,
  logMessage?: string
) => {
  const errorMessage = axios.isAxiosError(error)
    ? error.response?.data
      ? JSON.stringify(error.response?.data)
      : error.message
    : error.message;

  if (logMessage) {
    errorLogger(source, logMessage, apiKey, { message: errorMessage, error });
  } else {
    errorLogger(source, errorMessage, apiKey, { error });
  }

  const err = error as any;
  if (err.code || err.status || err.response?.status) {
    const status =
      err.status ||
      err.response?.status ||
      (err.code ? parseInt(err.code) : 500);

    var errorType: IntegrationErrorType | string;

    if (error instanceof DelegateToFrontedError) {
      var delegateToFrontedError = error as DelegateToFrontedError;
      errorType = delegateToFrontedError.errorType;
    } else {
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

    errorLogger(
      "throwAndDelegateError",
      `Delegating error to frontend with code ${DELEGATE_TO_FRONTEND_CODE} and type ${errorType}`,
      apiKey
    );
    throw new ServerError(DELEGATE_TO_FRONTEND_CODE, errorType);
  }
  throw new ServerError(500, "An internal error occurred");
};

export class DelegateToFrontedError extends Error {
  errorType: IntegrationErrorType;
  constructor(errorType: IntegrationErrorType) {
    super(errorType);

    this.errorType = errorType;
    this.name = "DelegateToFrontedError";
  }
}
