import { NextFunction, Request, Response } from 'express';
import { ServerError } from '../models';

export function errorHandlerMiddleware(
  error: Error | ServerError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
): void {
  if (error instanceof ServerError && error.status >= 400) {
    res.status(error.status).send(error.message);
    return;
  }

  res.status(500).send(error.message);
}
