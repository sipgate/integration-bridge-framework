import { NextFunction, Request, Response } from "express";
import { ServerError } from "../models";
import { RefreshError } from "../models/refresh-error.model";

export function errorHandlerMiddleware(
  error: Error | ServerError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (error instanceof ServerError || error instanceof RefreshError) {
    res.status(error.status).send(error.message);
    return;
  }

  res.status(500).send(error.message);
}
