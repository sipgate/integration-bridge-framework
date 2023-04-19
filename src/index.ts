import bodyParser from "body-parser";
import compression from "compression";
import cors from "cors";
import express from "express";
import { Server } from "http";
import { errorHandlerMiddleware, extractHeaderMiddleware } from "./middlewares";
import {
  Adapter,
  ContactCache,
  Controller,
  IntegrationEntityBridgeRequest,
} from "./models";
import { CustomRouter } from "./models/custom-router.model";
import { getContactCache } from "./util/get-contact-cache";

const PORT: number = Number(process.env.PORT) || 8080;

const app: express.Application = express();

app.use(compression());
app.use(
  cors({
    credentials: true,
    origin: true,
    allowedHeaders: "*",
  })
);
app.use(bodyParser.json());
app.use(extractHeaderMiddleware);

let cache: ContactCache | null = null;

export function start(
  adapter: Adapter,
  customRouters: CustomRouter[] = []
): Server {
  cache = getContactCache();

  const controller: Controller = new Controller(adapter, cache);
  app.get("/contacts", (req, res, next) =>
    controller.getContacts(req, res, next)
  );
  app.post("/contacts", (req, res, next) =>
    controller.createContact(req, res, next)
  );
  app.put("/contacts/:id", (req, res, next) =>
    controller.updateContact(req, res, next)
  );
  app.delete("/contacts/:id", (req, res, next) =>
    controller.deleteContact(req, res, next)
  );
  app.get(
    "/entity/:type/:id",
    (req: IntegrationEntityBridgeRequest, res, next) =>
      controller.getEntity(req, res, next)
  );
  app.get("/calendar", (req, res, next) =>
    controller.getCalendarEvents(req, res, next)
  );
  app.post("/calendar", (req, res, next) =>
    controller.createCalendarEvent(req, res, next)
  );
  app.put("/calendar/:id", (req, res, next) =>
    controller.updateCalendarEvent(req, res, next)
  );
  app.delete("/calendar/:id", (req, res, next) =>
    controller.deleteCalendarEvent(req, res, next)
  );
  app.post("/events/calls", (req, res, next) =>
    controller.handleCallEvent(req, res, next)
  );
  app.put("/events/calls/:id", (req, res, next) =>
    controller.updateCallEvent(req, res, next)
  );
  app.post("/events/connected", (req, res, next) =>
    controller.handleConnectedEvent(req, res, next)
  );
  app.get("/health", (req, res, next) => controller.getHealth(req, res, next));
  app.get("/oauth2/redirect", (req, res, next) =>
    controller.oAuth2Redirect(req, res, next)
  );
  app.get("/oauth2/callback", (req, res) =>
    controller.oAuth2Callback(req, res)
  );

  app.use(errorHandlerMiddleware);

  customRouters.forEach(({ path, router }) => app.use(path, router));

  return app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
}

export const deleteCacheItem = async (key: string) => {
  await cache?.delete(key);
};

export const getCacheItem = async (key: string) => {
  return (await cache?.get(key)) || [];
};

export * from "./models";
export * from "./util";
