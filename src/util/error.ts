import axios, { AxiosError } from "axios";
import {
  DELEGATE_TO_FRONTEND_CODE,
  IntegrationErrorType,
  ServerError,
} from "../models";
import { errorLogger } from "./logger.util";

export const throwAndDelegateError = (
  error: AxiosError | Error,
  source: string,
  apiKey: string | undefined,
  logMessage?: string
) => {
  const errorMessage =
    error instanceof AxiosError
      ? error.response?.data
        ? JSON.stringify(error.response?.data)
        : error.message
      : error.message;

  if (logMessage) {
    errorLogger(source, logMessage, apiKey, errorMessage);
  } else {
    errorLogger(source, errorMessage, apiKey);
  }
  if (axios.isAxiosError(error)) {
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
        console.log("bin default weil status= ", status);
        throw new ServerError(status, `${source} (${errorMessage})`);
    }
    console.log("bin außerhalb vom switch weil status= ", status);
    throw new ServerError(DELEGATE_TO_FRONTEND_CODE, errorType);
  }
  console.log("kein axios");
  throw new ServerError(500, "An internal error occurred");
};
