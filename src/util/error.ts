import { AxiosError } from "axios";
import {
  DELEGATE_TO_FRONTEND_CODE,
  IntegrationErrorType,
  ServerError,
} from "../models";

export const generateError = (
  error: Error | AxiosError,
  intentMessage: string
) => {
  if (error instanceof AxiosError) {
    const message = error.response?.data
      ? JSON.stringify(error.response?.data)
      : error.message;
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
        throw new ServerError(status, `${intentMessage} (${message})`);
    }
    throw new ServerError(DELEGATE_TO_FRONTEND_CODE, errorType);
  }
  throw new ServerError(500, "An internal error occurred");
};
