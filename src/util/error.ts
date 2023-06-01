import { AxiosError } from "axios";
import {
  DELEGATE_TO_FRONTEND_CODE,
  IntegrationErrorType,
  ServerError,
} from "../models";
import { errorLogger } from "./logger.util";

export const throwAndDelegateError = (
  error: Error | AxiosError,
  source: string,
  apiKey?: string
) => {
  const message =
    error instanceof AxiosError
      ? error.response?.data
        ? JSON.stringify(error.response?.data)
        : error.message
      : error.message;
  errorLogger(source, message, apiKey);
  if (error instanceof AxiosError) {
    const status = error.response?.status || 500;
    var errorType: IntegrationErrorType;
    switch (status) {
      case 401:
        errorType = IntegrationErrorType.INTEGRATION_REFRESH_ERROR;
        break;
      case 403:
        errorType = IntegrationErrorType.INTEGRATION_ERROR_FORBIDDEN;
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
        throw new ServerError(status, `${source} (${message})`);
    }
    throw new ServerError(DELEGATE_TO_FRONTEND_CODE, errorType);
  }
  throw new ServerError(500, "An internal error occurred");
};
