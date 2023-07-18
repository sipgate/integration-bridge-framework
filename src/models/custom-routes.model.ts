import { RequestHandler } from 'express';

export type CustomRoute = {
  requestType: 'get' | 'post' | 'put' | 'delete';
  path: string;
  handler: RequestHandler;
};
