import { otelSDK, tracingEnabled } from './tracing/tracing-initializer';

if (tracingEnabled) {
  otelSDK.start();
  console.log('tracing enabled');
} else {
  console.log('tracing not enabled');
}

import bodyParser from 'body-parser';
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import { Server } from 'http';
import { TokenCacheStorage } from './cache';
import { CallLogController } from './controllers/call-log.controller';
import { TaskController } from './controllers/task.controller';
import { errorHandlerMiddleware, extractHeaderMiddleware } from './middlewares';
import {
  Adapter,
  ContactCache,
  Controller,
  IntegrationEntitiesBridgeRequest,
  IntegrationEntityBridgeRequest,
} from './models';
import { CustomRouter } from './models/custom-router.model';
import { CustomRoute } from './models/custom-routes.model';
import { errorLogger, getTokenCache, infoLogger } from './util';
import { getContactCache } from './util/get-contact-cache';

const PORT: number = Number(process.env.PORT) || 8080;

const app: express.Application = express();

const corsMiddleware = cors({
  credentials: true,
  origin: true,
  allowedHeaders: '*',
});

app.use(compression());
app.use(corsMiddleware);
app.use(bodyParser.json());
app.use(extractHeaderMiddleware);

let contactCache: ContactCache | null = null;
export let tokenCache: TokenCacheStorage | null = null;

export function start(
  adapter: Adapter,
  customRouters: CustomRouter[] = [],
  customRoutes: CustomRoute[] = [],
): Server {
  contactCache = getContactCache();
  tokenCache = getTokenCache();

  const controller: Controller = new Controller(adapter, contactCache);
  const taskController: TaskController = new TaskController(adapter);
  const callLogController: CallLogController = new CallLogController(adapter);

  app.get('/contacts', (req, res, next) =>
    controller.getContacts(req, res, next),
  );

  app.post('/contacts', (req, res, next) =>
    controller.createContact(req, res, next),
  );

  app.get('/contacts/:id', (req, res, next) =>
    controller.getContact(req, res, next),
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
    '/contacts/:id/entities',
    (req: IntegrationEntitiesBridgeRequest, res, next) =>
      controller.getEntitiesForContact(req, res, next),
  );

  app.get(
    '/entity/:type/:id',
    (req: IntegrationEntityBridgeRequest, res, next) =>
      controller.getEntity(req, res, next),
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

  app.post('/events/disconnected', (req, res, next) =>
    controller.handleDisconnectedEvent(req, res, next),
  );

  app.put('/call-log', (req, res, next) =>
    callLogController.createOrUpdateCallLogsForEntities(req, res, next),
  );

  app.put('/call-log/phoneNumber', (req, res, next) =>
    callLogController.createCallLogForPhoneNumber(req, res, next),
  );

  app.get('/call-log-metadata', (req, res, next) =>
    callLogController.getCallLogMetadata(req, res, next),
  );

  app.get('/health', (req, res, next) => controller.getHealth(req, res, next));

  app.get('/validate-token', (req, res, next) =>
    controller.isValidToken(req, res, next),
  );

  app.get('/oauth2/redirect', (req, res, next) =>
    controller.oAuth2Redirect(req, res, next),
  );

  app.get('/oauth2/callback', (req, res) =>
    controller.oAuth2Callback(req, res),
  );

  app.get('/oauth2/token', (req, res) => controller.oAuth2Token(req, res));

  app.get('/account/id', (req, res, next) =>
    controller.getAccountId(req, res, next),
  );

  app.post('/webhook', (req, res, next) =>
    controller.handleWebhook(req, res, next),
  );

  app.get('/tasks/:id', (req, res, next) =>
    taskController.findById(req, res, next),
  );

  app.post('/tasks', (req, res, next) => taskController.create(req, res, next));

  app.get('/task-metadata', (req, res, next) =>
    taskController.getTaskMetadata(req, res, next),
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
