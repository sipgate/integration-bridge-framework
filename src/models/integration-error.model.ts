export enum IntegrationErrorType {
  INTEGRATION_INVALID_URL = "integration/invalid-url",
  INTEGRATION_REFRESH_ERROR = "integration/refresh-error",
  CONTACT_CREATE_ERROR_CONFLICT = "contact/create-error/conflict",
  CONTACT_CREATE_ERROR_EMAIL_CONFLICT = "contact/create-error/email-conflict",
  CONTACT_CREATE_ERROR_TOO_MANY_NUMBERS = "contact/create-error/too-many-numbers",
  CONTACT_UPDATE_ERROR_TOO_MANY_NUMBERS = "contact/update-error/too-many-numbers",
}

export const DELEGATE_TO_FRONTEND_CODE = 452;
