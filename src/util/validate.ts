import Ajv from 'ajv';
import { Config } from '../models';
import { errorLogger } from './logger.util';
import { ValidationSchema } from '../schemas/schema.model';

export function validate(
  ajv: Ajv,
  schemaKeyRef: ValidationSchema,
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
        `${schemaKeyRef.title.toLowerCase()}-validation failed: ${ajv.errorsText()}`,
        config.apiKey,
        ajv.errors,
      );
      return false;
    }

    return true;
  } catch (e) {
    errorLogger(
      'validate',
      'Error validating data',
      config.apiKey,
      e,
      ajv.errorsText(),
    );
    // Ignore validation if validation is broken
    return true;
  }
}
