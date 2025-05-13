import { NextFunction, Response } from 'express';
import { BridgeRequest } from '../models';
import { AsyncLocalStorage } from 'async_hooks';

const DEFAULT_LOCALE = 'de-DE';

export const integrationIdStorage = new AsyncLocalStorage<string>();

export function extractHeaderMiddleware(
  req: BridgeRequest<any>,
  res: Response,
  next: NextFunction,
): void {
  const userId = req.get('x-user-id') || '';
  const apiKey = req.get('x-provider-key') || '';
  const apiUrl = req.get('x-provider-url') || '';
  const locale = req.get('x-provider-locale') || DEFAULT_LOCALE;

  req.providerConfig = {
    userId,
    apiKey,
    apiUrl,
    locale,
  };

  integrationIdStorage.run(userId, () => next());
}
