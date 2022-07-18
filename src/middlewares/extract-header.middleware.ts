import { NextFunction, Response } from "express";
import { BridgeRequest } from "../models";

const DEFAULT_LOCALE = "de_DE";

export function extractHeaderMiddleware(
  req: BridgeRequest,
  res: Response,
  next: NextFunction
): void {
  const apiKey = req.get("x-provider-key") || "";
  const apiUrl = req.get("x-provider-url") || "";
  const locale = req.get("x-provider-locale") || DEFAULT_LOCALE;

  req.providerConfig = {
    apiKey,
    apiUrl,
    locale,
  };

  next();
}
