import {
  DELEGATE_TO_FRONTEND_CODE,
  IntegrationErrorType,
  ServerError,
} from '../../models';

export class DelegateToFrontedError extends ServerError {
  errorType: IntegrationErrorType;

  constructor(errorType: IntegrationErrorType) {
    super(DELEGATE_TO_FRONTEND_CODE, errorType);

    this.errorType = errorType;
    this.name = 'DelegateToFrontedError';
  }
}
