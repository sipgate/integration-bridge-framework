import bodyParser from "body-parser";
import compression from "compression";
import cors from "cors";
import express from "express";
import { Server } from "http";
import { errorHandlerMiddleware, extractHeaderMiddleware } from "./middlewares";
import { Adapter, Controller } from "./models";
import { getContactCache } from "./util/get-contact-cache";

const settingsPort: number = Number(process.env.PORT) || 8080;

const app: express.Application = express();

app.use(compression());
app.use(
  cors({
    credentials: true,
    origin: true,
  })
);
app.use(bodyParser.json());
app.use(extractHeaderMiddleware);

export function start(adapter: Adapter, port: number = settingsPort): Server {
  const cache = getContactCache();

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

  return app.listen(port, () => console.log(`Listening on port ${port}`));
}

export * from "./models";
