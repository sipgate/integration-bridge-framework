import axios, { AxiosError } from "axios";
import {
  DELEGATE_TO_FRONTEND_CODE,
  IntegrationErrorType,
  ServerError,
} from "../models";
import { errorLogger } from "./logger.util";

export const throwAndDelegateError = (
  error: AxiosError | ServerError | Error,
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
  if (err.code || err.response?.status) {
    const status =
      err.response?.status || (err.code ? parseInt(err.code) : 500);

    var errorType: IntegrationErrorType;
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
    throw new ServerError(DELEGATE_TO_FRONTEND_CODE, errorType);
  }
  throw new ServerError(500, "An internal error occurred");
};
