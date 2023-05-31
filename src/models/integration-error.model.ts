export enum IntegrationErrorType {
  INTEGRATION_INVALID_URL = "integration/invalid-url",

  // TODO: rename to INTEGRATION_ERROR_REFRESH = "integration/error/refresh"
  INTEGRATION_REFRESH_ERROR = "integration/refresh-error",
  INTEGRATION_ERROR_FORBIDDEN = "integration/error/forbidden",
  INTEGRATION_ERROR_UNAVAILABLE = "integration/error/unavailable",

  ENTITY_ERROR_CONFLICT = "entity/error/conflict",

  CONTACT_CREATE_ERROR_CONFLICT = "contact/create-error/conflict",
  CONTACT_CREATE_ERROR_EMAIL_CONFLICT = "contact/create-error/email-conflict",
  CONTACT_ERROR_TOO_MANY_NUMBERS = "contact/error/too-many-numbers",
  CONTACT_ERROR_INVALID_PHONE_TYPE = "contact/error/invalid-phone-type",
}

export const DELEGATE_TO_FRONTEND_CODE = 452;
