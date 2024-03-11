import Ajv from 'ajv';
import { Config } from '../models';
import { errorLogger } from './logger.util';

export function validate(
  ajv: Ajv,
  schemaKeyRef: object | string | boolean,
  data: object,
  config: Config,
) {
  try {
    const valid: boolean | PromiseLike<boolean> = ajv.validate(
      schemaKeyRef,
      data,
    );
    if (!valid) {
      errorLogger(
        'validate',
        'Validation failed',
        config?.apiKey,
        ajv.errorsText(),
      );
      return false;
    }

    return true;
  } catch (e) {
    console.error('Error validating data', e, ajv.errorsText());
    // Ignore validation if validation is broken
    return true;
  }
}
