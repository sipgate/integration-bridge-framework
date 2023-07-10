import { ServerError } from "../models";

export const timeout = (timeMs: number, errorMessage: string) =>
  new Promise((_, reject) =>
    setTimeout(() => reject(new ServerError(500, errorMessage)), timeMs)
  );
