import bodyParser from 'body-parser';
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import { Server } from 'http';
import { TokenStorageCache } from './cache';
import { errorHandlerMiddleware, extractHeaderMiddleware } from './middlewares';
import {
  Adapter,
  ContactCache,
  Controller,
  IntegrationEntityBridgeRequest,
} from './models';
import { CustomRouter } from './models/custom-router.model';
import { CustomRoute } from './models/custom-routes.model';
import { errorLogger, getTokenCache, infoLogger } from './util';
import { getContactCache } from './util/get-contact-cache';

export let tokenCache: TokenStorageCache;
const PORT: number = Number(process.env.PORT) || 8080;

const app: express.Application = express();

app.use(compression());
app.use(
  cors({
    credentials: true,
    origin: true,
    allowedHeaders: '*',
  }),
);
app.use(bodyParser.json());
app.use(extractHeaderMiddleware);

let contactCache: ContactCache | null = null;

export function start(
  adapter: Adapter,
  customRouters: CustomRouter[] = [],
  customRoutes: CustomRoute[] = [],
): Server {
  contactCache = getContactCache();
  tokenCache = getTokenCache();
  const controller: Controller = new Controller(adapter, contactCache);

  app.get('/contacts', (req, res, next) =>
    controller.getContacts(req, res, next),
  );

  app.post('/contacts', (req, res, next) =>
    controller.createContact(req, res, next),
  );

  app.put('/contacts/:id', (req, res, next) =>
    controller.updateContact(req, res, next),
  );

  app.delete('/contacts/:id', (req, res, next) =>
    controller.deleteContact(req, res, next),
  );

  app.post('/contacts/stream', (req, res, next) =>
    controller.streamContacts(req, res, next),
  );

  app.get(
    '/entity/:type/:id',
    (req: IntegrationEntityBridgeRequest, res, next) =>
      controller.getEntity(req, res, next),
  );

  app.get('/calendar', (req, res, next) =>
    controller.getCalendarEvents(req, res, next),
  );

  app.post('/calendar', (req, res, next) =>
    controller.createCalendarEvent(req, res, next),
  );

  app.put('/calendar/:id', (req, res, next) =>
    controller.updateCalendarEvent(req, res, next),
  );

  app.delete('/calendar/:id', (req, res, next) =>
    controller.deleteCalendarEvent(req, res, next),
  );

  app.post('/events/calls', (req, res, next) =>
    controller.handleCallEvent(req, res, next),
  );

  app.put('/events/calls/:id', (req, res, next) =>
    controller.updateCallEvent(req, res, next),
  );

  app.post('/events/connected', (req, res, next) =>
    controller.handleConnectedEvent(req, res, next),
  );

  app.put('/call-log', (req, res, next) =>
    controller.createOrUpdateCallLogsForEntities(req, res, next),
  );

  app.put('/call-log/phoneNumber', (req, res, next) =>
    controller.createCallLogForPhoneNumber(req, res, next),
  );

  app.get('/health', (req, res, next) => controller.getHealth(req, res, next));

  app.get('/oauth2/redirect', (req, res, next) =>
    controller.oAuth2Redirect(req, res, next),
  );

  app.get('/oauth2/callback', (req, res) =>
    controller.oAuth2Callback(req, res),
  );

  app.use(errorHandlerMiddleware);

  customRouters.forEach(({ path, router }) => app.use(path, router));

  customRoutes.forEach(({ requestType, path, handler: customHandler }) => {
    infoLogger('start', `CustomRoute ${path} added.`, undefined);

    const handler = (req: any, res: any, next: any) => {
      try {
        infoLogger(path, 'START', undefined);

        customHandler(req, res, next);

        infoLogger(path, 'END', undefined);
      } catch (error) {
        errorLogger(
          path,
          'Error while executing custom route',
          undefined,
          error ?? undefined,
        );
        next(error);
      }
    };

    switch (requestType) {
      case 'get':
        app.get(path, handler);
        break;
      case 'post':
        app.post(path, handler);
        break;
      case 'put':
        app.put(path, handler);
        break;
      case 'delete':
        app.delete(path, handler);
        break;

      default:
        throw `CustomRoute requestType ${requestType} not implemented!`;
    }
  });

  return app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
}

export const deleteContactCacheItem = async (key: string) => {
  await contactCache?.delete(key);
};

export const getContactCacheItem = async (key: string) => {
  return (await contactCache?.get(key)) || [];
};

export * from './models';
export * from './util';
