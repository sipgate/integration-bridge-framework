import { ZodSchema } from 'zod';
import { Config, ServerError } from '../models';
import { errorLogger } from './logger.util';

export function validate(
  schema: ZodSchema,
  data: unknown,
  config: Config,
  errorMessage: string,
) {
  const parseResult = schema.safeParse(data);

  if (parseResult.error) {
    errorLogger('validate', parseResult.error.message, config.apiKey);
    throw new ServerError(500, `${errorMessage}: ${parseResult.error.message}`);
  }

  return parseResult.data;
}
