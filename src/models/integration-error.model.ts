export enum IntegrationErrorType {
  INTEGRATION_INVALID_URL = 'integration/invalid-url',

  // TODO: rename to INTEGRATION_ERROR_REFRESH = "integration/error/refresh"
  INTEGRATION_REFRESH_ERROR = 'integration/refresh-error',
  INTEGRATION_UNAUTHORIZED_ERROR = 'integration/unauthorized-error',
  INTEGRATION_ERROR_FORBIDDEN = 'integration/error/forbidden',
  INTEGRATION_ERROR_UNAVAILABLE = 'integration/error/unavailable',
  INTEGRATION_ERROR_LICENSE_ACCESS_LIMITED = 'integration/error/license-access-limited',
  INTEGRATION_CONFIGURATION_ERROR = 'integration/configuration-error',

  ENTITY_ERROR_CONFLICT = 'entity/error/conflict',
  ENTITY_NOT_FOUND = 'entity/not-found',

  CONTACT_CREATE_ERROR_CONFLICT = 'contact/create-error/conflict',
  CONTACT_CREATE_ERROR_EMAIL_CONFLICT = 'contact/create-error/email-conflict',
  CONTACT_ERROR_TOO_MANY_NUMBERS = 'contact/error/too-many-numbers',
  CONTACT_ERROR_INVALID_PHONE_TYPE = 'contact/error/invalid-phone-type',
  CONTACT_ERROR_PHONENUMBER_EXISTS = 'contact/error/phonenumber-exists',
}

export const DELEGATE_TO_FRONTEND_CODE = 452;
