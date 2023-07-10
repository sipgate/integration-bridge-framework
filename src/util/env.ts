import * as dotenv from "dotenv";

export function isProduction() {
  return process.env.NODE_ENV === "production";
}

export interface APIConfig {
  API_URL: string;
}

export const parseEnvironment = (): APIConfig => {
  if (process.env.NODE_ENV === "development") dotenv.config();

  const { API_URL } = process.env;

  if (!API_URL) {
    throw new Error("Missing API_URL in environment.");
  }

  return {
    API_URL,
  };
};

export interface OAuth2Options {
  APP_ID: string;
  APP_SECRET: string;
  APP_REDIRECT_URL: string;
  NONCE_COOKIE_NAME: string;
  API_URL: string;
  APP_AUTHORIZE_URL: string;
  APP_ACCESSTOKEN_URL: string;
}

const DEFAULT_COOKIE_NAME = "oauth_nonce";

export const parseOAuthOptionFromEnvironment = (): OAuth2Options => {
  if (process.env.NODE_ENV === "development") dotenv.config();

  const {
    APP_ID,
    APP_SECRET,
    APP_REDIRECT_URL,
    API_URL,
    APP_AUTHORIZE_URL,
    APP_ACCESSTOKEN_URL,
    NONCE_COOKIE_NAME,
  } = process.env;

  if (!APP_ID) {
    throw new Error("Missing APP_ID in environment.");
  }
  if (!APP_SECRET) {
    throw new Error("Missing APP_SECRET in environment.");
  }
  if (!APP_REDIRECT_URL) {
    throw new Error("Missing APP_REDIRECT_URL in environment.");
  }
  if (!API_URL) {
    throw new Error("Missing API_URL in environment.");
  }
  if (!APP_AUTHORIZE_URL) {
    throw new Error("Missing APP_AUTHORIZE_URL in environment.");
  }
  if (!APP_ACCESSTOKEN_URL) {
    throw new Error("Missing APP_ACCESSTOKEN_URL in environment.");
  }
  return {
    APP_ID,
    APP_SECRET,
    APP_REDIRECT_URL,
    API_URL,
    APP_AUTHORIZE_URL,
    APP_ACCESSTOKEN_URL,
    NONCE_COOKIE_NAME: NONCE_COOKIE_NAME
      ? NONCE_COOKIE_NAME
      : DEFAULT_COOKIE_NAME,
  };
};
