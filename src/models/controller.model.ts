import Ajv from "ajv";
import { NextFunction, Request, Response } from "express";
import { stringify } from "querystring";
import {
  Adapter,
  CalendarEvent,
  CalendarEventTemplate,
  CallEvent,
  CallEventWithIntegrationEntities,
  Contact,
  ContactCache,
  ContactTemplate,
  ContactUpdate,
  ServerError,
} from ".";
import { calendarEventsSchema, contactsSchema } from "../schemas";
import { shouldSkipCallEvent } from "../util/call-event.util";
import { errorLogger, infoLogger, warnLogger } from "../util/logger.util";
import { parsePhoneNumber } from "../util/phone-number-utils";
import { validate } from "../util/validate";
import { APIContact } from "./api-contact.model";
import {
  BridgeRequest,
  IdBridgeRequest,
  IntegrationEntityBridgeRequest,
} from "./bridge-request.model";
import { CacheItemStateType } from "./cache-item-state.model";
import { CalendarFilterOptions } from "./calendar-filter-options.model";
import { IntegrationErrorType } from "./integration-error.model";

const CONTACT_FETCH_TIMEOUT: number = 3000;

function sanitizeContact(contact: Contact, locale: string): Contact {
  const result: APIContact = {
    ...contact,
    phoneNumbers: contact.phoneNumbers.map((phoneNumber) =>
      parsePhoneNumber(phoneNumber, locale)
    ),
  };
  return result;
}

export class Controller {
  private adapter: Adapter;
  private contactCache: ContactCache | null;
  private ajv: Ajv;

  constructor(adapter: Adapter, contactCache: ContactCache | null) {
    this.adapter = adapter;
    this.contactCache = contactCache;
    this.ajv = new Ajv();
  }

  public async getContacts(
    req: BridgeRequest<unknown>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { providerConfig } = req;

    if (!providerConfig) {
      throw new ServerError(400, "Missing parameters");
    }

    try {
      infoLogger("getContacts", "START", providerConfig.apiKey);

      const fetchContacts = async (): Promise<Contact[]> => {
        if (!this.adapter.getContacts) {
          throw new ServerError(501, "Fetching contacts is not implemented");
        }

        infoLogger("getContacts", `Fetching contacts…`, providerConfig.apiKey);

        const fetchedContacts: Contact[] = await this.adapter.getContacts(
          providerConfig
        );

        if (!validate(this.ajv, contactsSchema, fetchedContacts)) {
          throw new ServerError(500, "Invalid contacts received");
        }

        return fetchedContacts.map((contact) =>
          sanitizeContact(contact, providerConfig.locale)
        );
      };

      const fetcherPromise = this.contactCache
        ? this.contactCache.get(providerConfig.apiKey, fetchContacts)
        : fetchContacts();

      const timeoutPromise: Promise<"TIMEOUT"> = new Promise((resolve) =>
        setTimeout(() => resolve("TIMEOUT"), CONTACT_FETCH_TIMEOUT)
      );

      const raceResult = await Promise.race([fetcherPromise, timeoutPromise]);
      if (raceResult === "TIMEOUT") {
        infoLogger(
          `Fetching too slow, returning empty array.`,
          providerConfig.apiKey
        );
      }

      const responseContacts: Contact[] = Array.isArray(raceResult)
        ? raceResult
        : [];

      const contactsCount = responseContacts.length;

      infoLogger(
        "getContacts",
        `Found ${contactsCount} cached contacts`,
        providerConfig.apiKey
      );

      if (
        !Array.isArray(raceResult) &&
        (raceResult === "TIMEOUT" ||
          raceResult.state === CacheItemStateType.FETCHING)
      ) {
        res.header("X-Fetching-State", "pending");
      }

      if (this.adapter.getToken && req.providerConfig) {
        const { apiKey } = await this.adapter.getToken(req.providerConfig);
        res.header("X-Provider-Key", apiKey);
      }

      infoLogger("getContacts", "END", providerConfig.apiKey);
      res.status(200).send(responseContacts);
    } catch (error: any) {
      // prevent logging of refresh errors
      if (
        error instanceof ServerError &&
        error.message === IntegrationErrorType.INTEGRATION_REFRESH_ERROR
      ) {
        next(error);
        return;
      }

      errorLogger(
        "getContacts",
        "Could not get contacts:",
        providerConfig.apiKey,
        error
      );
      next(error);
    }
  }

  public async createContact(
    req: BridgeRequest<ContactTemplate>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { providerConfig: { apiKey = "", locale = "" } = {} } = req;
    try {
      infoLogger("createContact", "START", apiKey);

      if (!this.adapter.createContact) {
        throw new ServerError(501, "Creating contacts is not implemented");
      }

      if (!req.providerConfig) {
        throw new ServerError(400, "Missing config parameters");
      }
      infoLogger("createContact", "Creating contact", apiKey);

      const contact: Contact = await this.adapter.createContact(
        req.providerConfig,
        req.body
      );

      const valid = validate(this.ajv, contactsSchema, [contact]);

      if (!valid) {
        errorLogger(
          "createContact",
          "Invalid contact provided by adapter",
          apiKey,
          this.ajv.errorsText()
        );
        throw new ServerError(400, "Invalid contact provided by adapter");
      }

      infoLogger(
        "createContact",
        `Contact with id ${contact.id} created`,
        apiKey
      );

      const sanitizedContact: Contact = sanitizeContact(contact, locale);

      if (this.adapter.getToken && req.providerConfig) {
        const { apiKey } = await this.adapter.getToken(req.providerConfig);
        res.header("X-Provider-Key", apiKey);
      }
      res.status(200).send(sanitizedContact);

      if (this.contactCache) {
        const contacts = await this.contactCache.get(apiKey);
        if (Array.isArray(contacts)) {
          await this.contactCache.set(apiKey, [...contacts, sanitizedContact]);
        }
      }

      infoLogger("createContact", "END", apiKey);
    } catch (error) {
      // prevent logging of refresh errors
      if (
        error instanceof ServerError &&
        error.message === IntegrationErrorType.INTEGRATION_REFRESH_ERROR
      ) {
        next(error);
        return;
      }

      errorLogger(
        "createContact",
        "Could not create contact:",
        apiKey,
        error || "Unknown"
      );
      next(error);
    }
  }

  public async updateContact(
    req: IdBridgeRequest<ContactUpdate>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { providerConfig: { apiKey = "", locale = "" } = {} } = req;
    try {
      if (!this.adapter.updateContact) {
        throw new ServerError(501, "Updating contacts is not implemented");
      }

      if (!req.providerConfig) {
        throw new ServerError(400, "Missing config parameters");
      }

      infoLogger("updateContact", "Updating contact", apiKey);

      const contact: Contact = await this.adapter.updateContact(
        req.providerConfig,
        req.params.id,
        req.body
      );

      const valid = validate(this.ajv, contactsSchema, [contact]);
      if (!valid) {
        errorLogger(
          "updateContact",
          "Invalid contact provided by adapter",
          apiKey,
          this.ajv.errorsText()
        );
        throw new ServerError(400, "Invalid contact provided by adapter");
      }

      infoLogger(
        "updateContact",
        `Contact with id ${contact.id} updated`,
        apiKey
      );

      const sanitizedContact: Contact = sanitizeContact(contact, locale);

      if (this.adapter.getToken && req.providerConfig) {
        const { apiKey } = await this.adapter.getToken(req.providerConfig);
        res.header("X-Provider-Key", apiKey);
      }
      res.status(200).send(sanitizedContact);

      if (this.contactCache) {
        const contacts = await this.contactCache.get(apiKey);
        if (Array.isArray(contacts)) {
          const updatedCache: Contact[] = contacts.map((entry) =>
            entry.id === sanitizedContact.id ? sanitizedContact : entry
          );
          await this.contactCache.set(apiKey, updatedCache);
        }
      }

      infoLogger("updateContact", "END", apiKey);
    } catch (error) {
      // prevent logging of refresh errors
      if (
        error instanceof ServerError &&
        error.message === IntegrationErrorType.INTEGRATION_REFRESH_ERROR
      ) {
        next(error);
        return;
      }

      errorLogger(
        "updateContact",
        "Could not update contact:",
        apiKey,
        error || "Unknown"
      );
      next(error);
    }
  }

  public async deleteContact(
    req: IdBridgeRequest<unknown>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { providerConfig: { apiKey = "" } = {} } = req;
    try {
      infoLogger("deleteContact", "START", apiKey);

      if (!this.adapter.deleteContact) {
        throw new ServerError(501, "Deleting contacts is not implemented");
      }

      if (!req.providerConfig) {
        throw new ServerError(400, "Missing config parameters");
      }

      infoLogger("deleteContact", "Deleting contact", apiKey);

      const contactId = req.params.id;
      await this.adapter.deleteContact(req.providerConfig, contactId);

      if (this.adapter.getToken && req.providerConfig) {
        const { apiKey } = await this.adapter.getToken(req.providerConfig);
        res.header("X-Provider-Key", apiKey);
      }
      res.status(200).send();

      infoLogger(
        "deleteContact",
        `Contact with id ${contactId} deleted`,
        apiKey
      );

      if (this.contactCache) {
        const contacts = await this.contactCache.get(apiKey);
        if (Array.isArray(contacts)) {
          const updatedCache: Contact[] = contacts.filter(
            (entry) => entry.id !== contactId
          );
          await this.contactCache.set(apiKey, updatedCache);
        }
      }

      infoLogger("deleteContact", "END", apiKey);
    } catch (error) {
      // prevent logging of refresh errors
      if (
        error instanceof ServerError &&
        error.message === IntegrationErrorType.INTEGRATION_REFRESH_ERROR
      ) {
        next(error);
        return;
      }

      errorLogger(
        "deleteContact",
        "Could not delete contact:",
        apiKey,
        error || "Unknown"
      );
      next(error);
    }
  }

  public async getCalendarEvents(
    req: BridgeRequest<unknown>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const {
      providerConfig: { apiKey = "" } = {},
      query: { start, end },
    } = req;
    try {
      infoLogger("getCalendarEvents", "START", apiKey);

      if (!this.adapter.getCalendarEvents) {
        throw new ServerError(
          501,
          "Fetching calendar events is not implemented"
        );
      }

      if (!req.providerConfig) {
        errorLogger("getCalendarEvents", "Missing config parameters", apiKey);
        throw new ServerError(400, "Missing config parameters");
      }

      infoLogger("getCalendarEvents", "Fetching calendar events", apiKey);

      const filter: CalendarFilterOptions | null =
        typeof start === "string" && typeof end === "string"
          ? {
              start: Number(start),
              end: Number(end),
            }
          : null;

      const calendarEvents: CalendarEvent[] =
        await this.adapter.getCalendarEvents(req.providerConfig, filter);

      const valid = validate(this.ajv, calendarEventsSchema, calendarEvents);
      if (!valid) {
        errorLogger(
          "getCalendarEvents",
          `Invalid calendar events provided by adapter`,
          apiKey,
          this.ajv.errorsText()
        );
        throw new ServerError(
          400,
          "Invalid calendar events provided by adapter"
        );
      }

      infoLogger(
        "getCalendarEvents",
        `Found ${calendarEvents.length} events`,
        apiKey
      );
      res.status(200).send(calendarEvents);
      infoLogger("getCalendarEvents", `END`, apiKey);
    } catch (error) {
      errorLogger(
        "getCalendarEvents",
        `Could not get calendar events:`,
        apiKey,
        error || "Unknown"
      );
      next(error);
    }
  }

  public async createCalendarEvent(
    req: BridgeRequest<CalendarEventTemplate>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { providerConfig: { apiKey = "" } = {} } = req;
    try {
      infoLogger("createCalendarEvent", `START`, apiKey);

      if (!this.adapter.createCalendarEvent) {
        throw new ServerError(
          501,
          "Creating calendar events is not implemented"
        );
      }

      if (!req.providerConfig) {
        throw new ServerError(400, "Missing config parameters");
      }

      infoLogger("createCalendarEvent", `Creating calendar event`, apiKey);

      const calendarEvent: CalendarEvent =
        await this.adapter.createCalendarEvent(req.providerConfig, req.body);

      const valid = validate(this.ajv, calendarEventsSchema, [calendarEvent]);
      if (!valid) {
        errorLogger(
          "createCalendarEvent",
          "Invalid calendar event provided by adapter",
          apiKey,
          this.ajv.errorsText()
        );
        throw new ServerError(
          400,
          "Invalid calendar event provided by adapter"
        );
      }
      infoLogger("createCalendarEvent", `END`, apiKey);
      res.status(200).send(calendarEvent);
    } catch (error) {
      errorLogger(
        "createCalendarEvent",
        "Could not create calendar event:",
        apiKey,
        error || "Unknown"
      );
      next(error);
    }
  }

  public async updateCalendarEvent(
    req: IdBridgeRequest<CalendarEventTemplate>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { providerConfig: { apiKey = "" } = {} } = req;
    try {
      infoLogger("updateCalendarEvent", `START`, apiKey);
      if (!this.adapter.updateCalendarEvent) {
        throw new ServerError(
          501,
          "Updating calendar events is not implemented"
        );
      }

      if (!req.providerConfig) {
        throw new ServerError(400, "Missing config parameters");
      }
      infoLogger("updateCalendarEvent", `Updating calendar event`, apiKey);

      const calendarEvent: CalendarEvent =
        await this.adapter.updateCalendarEvent(
          req.providerConfig,
          req.params.id,
          req.body
        );

      const valid = validate(this.ajv, calendarEventsSchema, [calendarEvent]);
      if (!valid) {
        errorLogger(
          "updateCalendarEvent",
          `Invalid calendar event provided by adapter`,
          apiKey,
          this.ajv.errorsText()
        );
        throw new ServerError(
          400,
          "Invalid calendar event provided by adapter"
        );
      }
      infoLogger("updateCalendarEvent", `END`, apiKey);

      res.status(200).send(calendarEvent);
    } catch (error) {
      errorLogger(
        "updateCalendarEvent",
        `Could not update calendar event:`,
        apiKey,
        error || "Unknown"
      );
      next(error);
    }
  }

  public async deleteCalendarEvent(
    req: IdBridgeRequest<unknown>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { providerConfig: { apiKey = "" } = {} } = req;
    try {
      infoLogger("deleteCalendarEvent", `START`, apiKey);

      if (!this.adapter.deleteCalendarEvent) {
        throw new ServerError(
          501,
          "Deleting calendar events is not implemented"
        );
      }

      if (!req.providerConfig) {
        throw new ServerError(400, "Missing config parameters");
      }
      infoLogger("deleteCalendarEvent", `Deleting calendar event`, apiKey);
      await this.adapter.deleteCalendarEvent(req.providerConfig, req.params.id);
      infoLogger("deleteCalendarEvent", `END`, apiKey);
      res.status(200).send();
    } catch (error) {
      errorLogger(
        "deleteCalendarEvent",
        `Could not delete calendar event:`,
        apiKey,
        error || "Unknown"
      );
      next(error);
    }
  }

  public async handleCallEvent(
    req: BridgeRequest<CallEvent>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { providerConfig } = req;

    try {
      infoLogger("handleCallEvent", `START`, providerConfig?.apiKey);
      if (!providerConfig) {
        throw new ServerError(400, "Missing config parameters");
      }

      if (!this.adapter.handleCallEvent) {
        throw new ServerError(501, "Handling call event is not implemented");
      }

      if (shouldSkipCallEvent(req.body)) {
        infoLogger(
          "handleCallEvent",
          `Skipping call event for call id ${req.body.id}`,
          providerConfig.apiKey
        );
        res.status(200).send("Skipping call event");
        return;
      }

      infoLogger(
        "handleCallEvent",
        `Handling call event`,
        providerConfig.apiKey
      );

      const integrationCallEventRef = await this.adapter.handleCallEvent(
        providerConfig,
        req.body
      );

      if (integrationCallEventRef != "")
        infoLogger(
          "handleCallEvent",
          `CallEvent with refId ${integrationCallEventRef} created!`,
          providerConfig.apiKey
        );
      else
        warnLogger(
          "handleCallEvent",
          `Did not create callEvent`,
          providerConfig.apiKey
        );

      infoLogger("handleCallEvent", `END`, providerConfig.apiKey);
      res.status(200).send(integrationCallEventRef);
    } catch (error) {
      errorLogger(
        "handleCallEvent",
        "Could not handle call event:",
        providerConfig?.apiKey,
        error || "Unknown"
      );
      next(error);
    }
  }

  public async createCallLogForEntities(
    req: BridgeRequest<CallEventWithIntegrationEntities>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { providerConfig } = req;

    try {
      infoLogger("createCallLogForEntities", `START`, providerConfig?.apiKey);

      if (!providerConfig) {
        throw new ServerError(400, "Missing config parameters");
      }

      if (!this.adapter.createCallLogsForEntities) {
        throw new ServerError(501, "Creating call log is not implemented");
      }

      if (shouldSkipCallEvent(req.body)) {
        infoLogger(
          "createCallLogForEntities",
          `Skipping call log for call id ${req.body.id}`,
          providerConfig.apiKey
        );
        res.status(200).send("Skipping call log");
        return;
      }

      infoLogger(
        "createCallLogForEntities",
        `Creating call Logs…`,
        providerConfig.apiKey
      );

      const entitiesWithCallLogReferences =
        await this.adapter.createCallLogsForEntities(providerConfig, req.body);

      entitiesWithCallLogReferences.forEach(({ id, logId }) =>
        infoLogger(
          "createCallLogForEntities",
          `CallEvent with logId ${logId} created for id ${id}`,
          providerConfig?.apiKey
        )
      );

      infoLogger("createCallLogForEntities", `END`, providerConfig?.apiKey);
      res.status(200).send(entitiesWithCallLogReferences);
    } catch (error) {
      errorLogger(
        "createCallLogForEntities",
        "Could not create call logs:",
        providerConfig?.apiKey,
        error || "Unknown"
      );
      next(error);
    }
  }

  public async handleConnectedEvent(
    req: BridgeRequest<unknown>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { providerConfig: { apiKey = "" } = {} } = req;
    try {
      infoLogger("handleConnectedEvent", `START`, apiKey);

      if (!this.adapter.handleConnectedEvent) {
        throw new ServerError(
          501,
          "Handling connected event is not implemented"
        );
      }

      if (!req.providerConfig) {
        throw new ServerError(400, "Missing config parameters");
      }
      infoLogger("handleConnectedEvent", `Handling connected event`, apiKey);

      await this.adapter.handleConnectedEvent(req.providerConfig);

      infoLogger("handleConnectedEvent", `END`, apiKey);
      res.status(200).send();
    } catch (error) {
      errorLogger(
        "handleConnectedEvent",
        `Could not handle connected event:`,
        apiKey,
        error || "Unknown"
      );
      next(error);
    }
  }

  public async updateCallEvent(
    req: BridgeRequest<CallEvent>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { providerConfig: { apiKey = "" } = {}, body, params } = req;

    try {
      infoLogger("updateCallEvent", `START`, apiKey);
      if (!this.adapter.updateCallEvent) {
        throw new ServerError(501, "Updating contacts is not implemented");
      }

      if (!req.providerConfig) {
        throw new ServerError(400, "Missing config parameters");
      }
      infoLogger("updateCallEvent", `Updating call event`, apiKey);

      await this.adapter.updateCallEvent(req.providerConfig, params.id, body);
      infoLogger("updateCallEvent", `END`, apiKey);
      res.status(200).send();
    } catch (error) {
      errorLogger(
        "updateCallEvent",
        `Could not update call event:`,
        apiKey,
        error || "Unknown"
      );
      next(error);
    }
  }

  public async getEntity(
    req: IntegrationEntityBridgeRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { providerConfig } = req;
    try {
      infoLogger("getEntity", `START`, providerConfig?.apiKey);

      if (!providerConfig) {
        throw new ServerError(400, "Missing parameters");
      }

      if (!this.adapter.getEntity) {
        throw new ServerError(501, "Fetching Entity is not implemented");
      }

      const fetchedEntity = await this.adapter.getEntity(
        providerConfig,
        req.params.id,
        req.params.type
      );

      infoLogger("getEntity", `[${fetchedEntity}] `, providerConfig.apiKey);
      infoLogger("getEntity", `END`, providerConfig?.apiKey);
      res.status(200).send(fetchedEntity);
    } catch (error) {
      errorLogger(
        "getEntity",
        "Could not get entity:",
        providerConfig?.apiKey,
        error
      );
      next(error);
    }
  }

  public async getHealth(
    req: BridgeRequest<unknown>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (this.adapter.getHealth) {
        await this.adapter.getHealth();
      }
      res.sendStatus(200);
    } catch (error) {
      errorLogger("getHealth", "Health check failed:", "", error || "Unknown");
      next(error || "Internal Server Error");
    }
  }

  public async oAuth2Redirect(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!this.adapter.getOAuth2RedirectUrl) {
        throw new ServerError(501, "OAuth2 flow not implemented");
      }

      const redirectUrl = await this.adapter.getOAuth2RedirectUrl(req, res);

      res.status(200).send({ redirectUrl });
    } catch (error) {
      errorLogger(
        "oAuth2Redirect",
        "Could not get OAuth2 redirect URL:",
        "",
        error || "Unknown"
      );
      next(error);
    }
  }

  public async oAuth2Callback(req: Request, res: Response): Promise<void> {
    let {
      OAUTH2_REDIRECT_URL: redirectUrl,
      OAUTH2_IDENTIFIER: oAuth2Identifier = "UNKNOWN",
    } = process.env;

    if (!redirectUrl) {
      errorLogger("oAuth2Callback", "OAuth2 Redirect URL not configured!", "");
      res.status(500).send("OAuth2 Redirect URL not configured!");
      return;
    }

    try {
      if (!this.adapter.handleOAuth2Callback) {
        throw new ServerError(501, "OAuth2 flow not implemented");
      }

      const { apiKey, apiUrl } = await this.adapter.handleOAuth2Callback(
        req,
        res
      );

      const params = stringify({
        name: oAuth2Identifier,
        key: apiKey,
        url: apiUrl,
      });

      res.redirect(`${redirectUrl}?${params}`);
    } catch (error) {
      errorLogger(
        "oAuth2Callback",
        "Unable to save OAuth2 token:",
        "",
        error || "Unknown"
      );
      res.redirect(redirectUrl);
    }
  }
}
