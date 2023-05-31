import { AxiosError } from "axios";
import {
  DELEGATE_TO_FRONTEND_CODE,
  IntegrationErrorType,
  ServerError,
} from "../models";

export const generateError = (
  error: Error | AxiosError,
  intentMessage: string
): ServerError => {
  if (error instanceof AxiosError) {
    const message = error.response?.data
      ? JSON.stringify(error.response?.data)
      : error.message;
    const status = error.response?.status || 500;
    switch (status) {
      case 401:
        return new ServerError(
          DELEGATE_TO_FRONTEND_CODE,
          IntegrationErrorType.INTEGRATION_REFRESH_ERROR
        );
      case 403:
        return new ServerError(
          DELEGATE_TO_FRONTEND_CODE,
          IntegrationErrorType.INTEGRATION_ERROR_FORBIDDEN
        );
      case 409:
        return new ServerError(
          DELEGATE_TO_FRONTEND_CODE,
          IntegrationErrorType.ENTITY_ERROR_CONFLICT
        );
      case 502:
      case 503:
      case 504:
        return new ServerError(
          DELEGATE_TO_FRONTEND_CODE,
          IntegrationErrorType.INTEGRATION_ERROR_UNAVAILABLE
        );

      default:
        return new ServerError(status, `${intentMessage} (${message})`);
    }
  }
  return new ServerError(500, "An internal error occurred");
};
