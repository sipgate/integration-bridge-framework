import { randomBytes } from "crypto";
import { Request, Response } from "express";
import Cookies from "cookies";

export function nonce(): string {
  const length = 15;
  const bytes = randomBytes(length);

  const nonce = bytes
    .map((byte) => {
      return byte % 10;
    })
    .join("");

  return nonce;
}

export function getNonceFromCookie(
  request: Request,
  response: Response,
  name: string,
  secret: string
): string | undefined {
  const cookies = new Cookies(request, response, {
    secure: true,
    keys: [secret],
  });
  return cookies.get(name, { signed: true });
}

export function setNonceCookie(
  req: Request,
  res: Response,
  cookieName: string,
  secret: string,
  state: string
) {
  const cookies = new Cookies(req, res, {
    keys: [secret],
    secure: true,
  });
  cookies.set(cookieName, state, {
    signed: true,
    expires: new Date(Date.now() + 60000), // ToDo: MilliSeconds? 10 minuten expire date
    sameSite: "none",
    secure: true,
  });
}

export function deleteNonceCookie(
  req: Request,
  res: Response,
  cookieName: string,
  secret: string
) {
  const cookies = new Cookies(req, res, {
    keys: [secret],
    secure: true,
  });
  cookies.set(cookieName);
}
