import axios, { AxiosResponse } from 'axios';
import { Request, Response } from 'express';
import * as util from 'util';
import { Security } from '.';
import { ServerError } from '../models';

export type ExtractTokenFromResponseFn<T> = (response: AxiosResponse) => T;

export interface OAuthParams {
  accesTokenUrl: string;
  apiUrl: string;
  redirect_uri: string;
  cookieName: string;
  client_id: string;
  client_secret: string;
  authorizeUrl: string;
}

export interface OAuthCallbackParams {
  cookieName: string;
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  extractToken: ExtractTokenFromResponseFn<any>;
}

export async function getOAuth2RedirectUrl(
  config: OAuthParams,
  req: Request,
  res: Response,
): Promise<string> {
  try {
    const nonce_string: string = Security.Nonce.nonce();
    const state = JSON.stringify({
      nonce: nonce_string,
      accessTokenUrl: config.accesTokenUrl,
      apiUrl: config.apiUrl,
    });
    const searchParamsAuth = new URLSearchParams({
      response_type: 'code',
      redirect_uri: config.redirect_uri,
      client_id: config.client_id,
      state,
    });
    Security.Nonce.setNonceCookie(
      req,
      res,
      config.cookieName,
      config.client_secret,
      nonce_string,
    );
    const url = new URL(config.authorizeUrl);
    url.search = searchParamsAuth.toString();
    return url.toString();
  } catch (exception: any) {
    const errorMessage = `Error in getOAuth2RedirectUrl:  ${JSON.stringify(
      exception,
      Object.getOwnPropertyNames(exception),
    )} ${util.inspect(exception?.response?.data, { depth: 3 })}`;
    console.error(errorMessage);
    throw new ServerError(500, errorMessage);
  }
}

export async function handleOAuth2Callback(
  config: OAuthCallbackParams,
  req: Request,
  res: Response,
  checkNonceCookie: boolean = false,
  paramCommunication: GetAccessTokenParamCommunication = GetAccessTokenParamCommunication.BODY,
): Promise<{ apiKey: string; apiUrl: string; query_params: any }> {
  try {
    if (req.query.error)
      throw `Error in handleOAuth2Callback flow: ${req.query.error} ${req?.query?.error_description}`;
    if (!req?.query?.state)
      throw 'Unexpected: request has not query param "state"';
    if (!req?.query?.code)
      throw 'Unexpected: request has not query param "code"';
    const nonce_cookie = Security.Nonce.getNonceFromCookie(
      req,
      res,
      config.cookieName,
      config.client_secret,
    );
    const state = JSON.parse(req.query.state.toString());
    if (checkNonceCookie) {
      if (!nonce_cookie)
        throw `Unexpected: cookie ${config.cookieName} not found`;

      const nonce_request: string = state.nonce;
      if (nonce_request !== nonce_cookie)
        if (nonce_request !== nonce_cookie)
          throw `Unexpected: nonce parameter from request and from cookie are different. Possible CSFR attack!`;
      Security.Nonce.deleteNonceCookie(
        req,
        res,
        config.cookieName,
        config.client_secret,
      );
    }
    const response = await getAccessToken(
      state.accessTokenUrl,
      req.query.code.toString(),
      config.client_id,
      config.client_secret,
      config.redirect_uri,
      paramCommunication,
    );
    return {
      apiKey: config.extractToken(response),
      apiUrl: state.apiUrl,
      query_params: req.query,
    };
  } catch (exception: any) {
    const errorMessage = `Error in handleOAuth2Callback: ${JSON.stringify(
      exception,
      Object.getOwnPropertyNames(exception),
    )} ${util.inspect(exception?.response?.data, { depth: 3 })}`;
    console.error(errorMessage);
    throw new ServerError(500, errorMessage);
  }
}
export enum GetAccessTokenParamCommunication {
  QUERY_PARAM,
  X_WWW_FORM_URL_ENCODED,
  BODY,
}
async function getAccessToken(
  accessTokenURL: string,
  authorizationCode: string,
  clientId: string,
  clientSecret: string,
  redirect_uri: string,
  paramCommunication: GetAccessTokenParamCommunication = GetAccessTokenParamCommunication.BODY,
) {
  console.log(`Start: fetching access tokens`);
  const params = {
    grant_type: 'authorization_code',
    code: authorizationCode,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirect_uri,
  };
  switch (paramCommunication) {
    case GetAccessTokenParamCommunication.QUERY_PARAM:
      return await axios.post(accessTokenURL, {}, { params: params });
    case GetAccessTokenParamCommunication.X_WWW_FORM_URL_ENCODED:
      return await axios.post(accessTokenURL, new URLSearchParams(params), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
    case GetAccessTokenParamCommunication.BODY:
      return await axios.post(accessTokenURL, params);
    default:
      throw Error('Unexpected parameter communication type');
  }
}

export async function refreshToken(
  accessTokenURL: string,
  refresh_token: string,
  clientId: string,
  clientSecret: string,
  paramCommunication: GetAccessTokenParamCommunication = GetAccessTokenParamCommunication.BODY,
) {
  console.log(`Start: refreshing access tokens`);
  const params = {
    grant_type: 'refresh_token',
    refresh_token: refresh_token,
    client_id: clientId,
    client_secret: clientSecret,
  };
  switch (paramCommunication) {
    case GetAccessTokenParamCommunication.QUERY_PARAM:
      return await axios.post(accessTokenURL, {}, { params: params });
    case GetAccessTokenParamCommunication.X_WWW_FORM_URL_ENCODED:
      return await axios.post(accessTokenURL, new URLSearchParams(params), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
    case GetAccessTokenParamCommunication.BODY:
      return await axios.post(accessTokenURL, params);
    default:
      throw Error('Unexpected parameter communication type');
  }
}
