import Ajv from "ajv";
import { NextFunction, Request, Response } from "express";
import { stringify } from "querystring";
import {
  Adapter,
  BridgeRequest,
  CalendarEvent,
  CalendarEventTemplate,
  CallEvent,
  Contact,
  ContactCache,
  ContactTemplate,
  ContactUpdate,
  ServerError,
} from ".";
import { calendarEventsSchema, contactsSchema } from "../schemas";
import { anonymizeKey } from "../util/anonymize-key";
import { convertPhoneNumberToE164 } from "../util/phone-number-utils";
import { validate } from "../util/validate";
import { CalendarFilterOptions } from "./calendar-filter-options.model";
import { PhoneNumberLabel } from "./contact.model";

const CONTACT_FETCH_TIMEOUT: number = 3000;

function sanitizeContact(contact: Contact, locale: string): Contact {
  const result: Contact = {
    ...contact,
    phoneNumbers: contact.phoneNumbers.map((phoneNumber) => ({
      ...phoneNumber,
      phoneNumber:
        phoneNumber.label === PhoneNumberLabel.DIRECTDIAL
          ? phoneNumber.phoneNumber
          : convertPhoneNumberToE164(phoneNumber.phoneNumber, locale),
    })),
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

    this.getContacts = this.getContacts.bind(this);
    this.createContact = this.createContact.bind(this);
    this.updateContact = this.updateContact.bind(this);
    this.deleteContact = this.deleteContact.bind(this);
    this.getCalendarEvents = this.getCalendarEvents.bind(this);
    this.createCalendarEvent = this.createCalendarEvent.bind(this);
    this.updateCalendarEvent = this.updateCalendarEvent.bind(this);
    this.deleteCalendarEvent = this.deleteCalendarEvent.bind(this);
    this.handleCallEvent = this.handleCallEvent.bind(this);
    this.handleConnectedEvent = this.handleConnectedEvent.bind(this);
    this.getHealth = this.getHealth.bind(this);
    this.oAuth2Redirect = this.oAuth2Redirect.bind(this);
    this.oAuth2Callback = this.oAuth2Callback.bind(this);
  }

  public async getContacts(
    req: BridgeRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { providerConfig: { apiKey = "", locale = "" } = {} } = req;
    try {
      const fetchContacts = async (): Promise<Contact[]> => {
        if (!this.adapter.getContacts) {
          throw new ServerError(501, "Fetching contacts is not implemented");
        }

        if (!req.providerConfig) {
          throw new ServerError(400, "Missing parameters");
        }

        console.log(`Fetching contacts for key "${anonymizeKey(apiKey)}"`);

        const fetchedContacts: Contact[] = await this.adapter.getContacts(
          req.providerConfig
        );

        if (!validate(this.ajv, contactsSchema, fetchedContacts)) {
          throw new ServerError(500, "Invalid contacts received");
        }

        return fetchedContacts.map((contact) =>
          sanitizeContact(contact, locale)
        );
      };

      const fetcherPromise = this.contactCache
        ? this.contactCache.get(apiKey, fetchContacts)
        : fetchContacts();

      const timeoutPromise: Promise<Contact[]> = new Promise((resolve) =>
        setTimeout(() => resolve([]), CONTACT_FETCH_TIMEOUT)
      );

      const contacts = await Promise.race([fetcherPromise, timeoutPromise]);

      const responseContacts: Contact[] = contacts || [];

      console.log(
        `Found ${
          responseContacts.length
        } cached contacts for key "${anonymizeKey(apiKey)}"`
      );

      if (this.adapter.getToken && req.providerConfig) {
        const { apiKey } = await this.adapter.getToken(req.providerConfig);
        res.header("X-Provider-Key", apiKey);
      }

      res.status(200).send(responseContacts);
    } catch (error) {
      console.error("Could not get contacts:", error || "Unknown");
      next(error);
    }
  }

  public async createContact(
    req: BridgeRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { providerConfig: { apiKey = "", locale = "" } = {} } = req;
    try {
      if (!this.adapter.createContact) {
        throw new ServerError(501, "Creating contacts is not implemented");
      }

      if (!req.providerConfig) {
        throw new ServerError(400, "Missing config parameters");
      }

      console.log(`Creating contact for key "${anonymizeKey(apiKey)}"`);

      const contact: Contact = await this.adapter.createContact(
        req.providerConfig,
        req.body as ContactTemplate
      );

      const valid = validate(this.ajv, contactsSchema, [contact]);

      if (!valid) {
        console.error(
          "Invalid contact provided by adapter",
          this.ajv.errorsText()
        );
        throw new ServerError(400, "Invalid contact provided by adapter");
      }

      const sanitizedContact: Contact = sanitizeContact(contact, locale);

      if (this.adapter.getToken && req.providerConfig) {
        const { apiKey } = await this.adapter.getToken(req.providerConfig);
        res.header("X-Provider-Key", apiKey);
      }
      res.status(200).send(sanitizedContact);

      if (this.contactCache) {
        const cached = await this.contactCache.get(apiKey);
        if (cached) {
          await this.contactCache.set(apiKey, [...cached, sanitizedContact]);
        }
      }
    } catch (error) {
      console.error("Could not create contact:", error || "Unknown");
      next(error);
    }
  }

  public async updateContact(
    req: BridgeRequest,
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

      console.log(`Updating contact for key "${anonymizeKey(apiKey)}"`);

      const contact: Contact = await this.adapter.updateContact(
        req.providerConfig,
        req.params.id,
        req.body as ContactUpdate
      );

      const valid = validate(this.ajv, contactsSchema, [contact]);
      if (!valid) {
        console.error(
          "Invalid contact provided by adapter",
          this.ajv.errorsText()
        );
        throw new ServerError(400, "Invalid contact provided by adapter");
      }

      const sanitizedContact: Contact = sanitizeContact(contact, locale);

      if (this.adapter.getToken && req.providerConfig) {
        const { apiKey } = await this.adapter.getToken(req.providerConfig);
        res.header("X-Provider-Key", apiKey);
      }
      res.status(200).send(sanitizedContact);

      if (this.contactCache) {
        const cachedContacts = await this.contactCache.get(apiKey);
        if (cachedContacts) {
          const updatedCache: Contact[] = cachedContacts.map((entry) =>
            entry.id === sanitizedContact.id ? sanitizedContact : entry
          );
          await this.contactCache.set(apiKey, updatedCache);
        }
      }
    } catch (error) {
      console.error("Could not update contact:", error || "Unknown");
      next(error);
    }
  }

  public async deleteContact(
    req: BridgeRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { providerConfig: { apiKey = "" } = {} } = req;
    try {
      if (!this.adapter.deleteContact) {
        throw new ServerError(501, "Deleting contacts is not implemented");
      }

      if (!req.providerConfig) {
        throw new ServerError(400, "Missing config parameters");
      }

      console.log(`Deleting contact for key "${anonymizeKey(apiKey)}"`);

      const contactId: string = req.params.id;
      await this.adapter.deleteContact(req.providerConfig, contactId);

      if (this.adapter.getToken && req.providerConfig) {
        const { apiKey } = await this.adapter.getToken(req.providerConfig);
        res.header("X-Provider-Key", apiKey);
      }
      res.status(200).send();

      if (this.contactCache) {
        const cached = await this.contactCache.get(apiKey);
        if (cached) {
          const updatedCache: Contact[] = cached.filter(
            (entry) => entry.id !== contactId
          );
          await this.contactCache.set(apiKey, updatedCache);
        }
      }
    } catch (error) {
      console.error("Could not delete contact:", error || "Unknown");
      next(error);
    }
  }

  public async getCalendarEvents(
    req: BridgeRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const {
      providerConfig: { apiKey = "" } = {},
      query: { start, end },
    } = req;
    try {
      if (!this.adapter.getCalendarEvents) {
        throw new ServerError(
          501,
          "Fetching calendar events is not implemented"
        );
      }

      if (!req.providerConfig) {
        console.error("Missing config parameters");
        throw new ServerError(400, "Missing config parameters");
      }

      console.log(`Fetching calendar events for key "${anonymizeKey(apiKey)}"`);

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
        console.error(
          "Invalid calendar events provided by adapter",
          this.ajv.errorsText()
        );
        throw new ServerError(
          400,
          "Invalid calendar events provided by adapter"
        );
      }

      console.log(
        `Found ${calendarEvents.length} events for key "${anonymizeKey(
          apiKey
        )}"`
      );
      res.status(200).send(calendarEvents);
    } catch (error) {
      console.error("Could not get calendar events:", error || "Unknown");
      next(error);
    }
  }

  public async createCalendarEvent(
    req: BridgeRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { providerConfig: { apiKey = "" } = {} } = req;
    try {
      if (!this.adapter.createCalendarEvent) {
        throw new ServerError(
          501,
          "Creating calendar events is not implemented"
        );
      }

      if (!req.providerConfig) {
        throw new ServerError(400, "Missing config parameters");
      }

      console.log(`Creating calendar event for key "${anonymizeKey(apiKey)}"`);

      const calendarEvent: CalendarEvent =
        await this.adapter.createCalendarEvent(
          req.providerConfig,
          req.body as CalendarEventTemplate
        );

      const valid = validate(this.ajv, calendarEventsSchema, [calendarEvent]);
      if (!valid) {
        console.error(
          "Invalid calendar event provided by adapter",
          this.ajv.errorsText()
        );
        throw new ServerError(
          400,
          "Invalid calendar event provided by adapter"
        );
      }

      res.status(200).send(calendarEvent);
    } catch (error) {
      console.error("Could not create calendar event:", error || "Unknown");
      next(error);
    }
  }

  public async updateCalendarEvent(
    req: BridgeRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { providerConfig: { apiKey = "" } = {} } = req;
    try {
      if (!this.adapter.updateCalendarEvent) {
        throw new ServerError(
          501,
          "Updating calendar events is not implemented"
        );
      }

      if (!req.providerConfig) {
        throw new ServerError(400, "Missing config parameters");
      }

      console.log(`Updating calendar event for key "${anonymizeKey(apiKey)}"`);

      const calendarEvent: CalendarEvent =
        await this.adapter.updateCalendarEvent(
          req.providerConfig,
          req.params.id,
          req.body as CalendarEventTemplate
        );

      const valid = validate(this.ajv, calendarEventsSchema, [calendarEvent]);
      if (!valid) {
        console.error(
          "Invalid calendar event provided by adapter",
          this.ajv.errorsText()
        );
        throw new ServerError(
          400,
          "Invalid calendar event provided by adapter"
        );
      }

      res.status(200).send(calendarEvent);
    } catch (error) {
      console.error("Could not update calendar event:", error || "Unknown");
      next(error);
    }
  }

  public async deleteCalendarEvent(
    req: BridgeRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { providerConfig: { apiKey = "" } = {} } = req;
    try {
      if (!this.adapter.deleteCalendarEvent) {
        throw new ServerError(
          501,
          "Deleting calendar events is not implemented"
        );
      }

      if (!req.providerConfig) {
        throw new ServerError(400, "Missing config parameters");
      }

      console.log(`Deleting calendar event for key "${anonymizeKey(apiKey)}"`);

      await this.adapter.deleteCalendarEvent(req.providerConfig, req.params.id);
      res.status(200).send();
    } catch (error) {
      console.error("Could not delete calendar event:", error || "Unknown");
      next(error);
    }
  }

  public async handleCallEvent(
    req: BridgeRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { providerConfig: { apiKey = "" } = {} } = req;
    try {
      if (!this.adapter.handleCallEvent) {
        throw new ServerError(501, "Handling call event is not implemented");
      }

      if (!req.providerConfig) {
        throw new ServerError(400, "Missing config parameters");
      }

      console.log(`Handling call event for key "${anonymizeKey(apiKey)}"`);

      const integrationCallEventRef = await this.adapter.handleCallEvent(
        req.providerConfig,
        req.body as CallEvent
      );

      res.status(200).send(integrationCallEventRef);
    } catch (error) {
      console.error("Could not handle call event:", error || "Unknown");
      next(error);
    }
  }

  public async handleConnectedEvent(
    req: BridgeRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { providerConfig: { apiKey = "" } = {} } = req;
    try {
      if (!this.adapter.handleConnectedEvent) {
        throw new ServerError(
          501,
          "Handling connected event is not implemented"
        );
      }

      if (!req.providerConfig) {
        throw new ServerError(400, "Missing config parameters");
      }

      console.log(`Handling connected event for key "${anonymizeKey(apiKey)}"`);

      await this.adapter.handleConnectedEvent(req.providerConfig);

      res.status(200).send();
    } catch (error) {
      console.error("Could not handle connected event:", error || "Unknown");
      next(error);
    }
  }

  public async getHealth(
    req: BridgeRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (this.adapter.getHealth) {
        await this.adapter.getHealth();
      }
      res.sendStatus(200);
    } catch (error) {
      console.error("Health check failed:", error || "Unknown");
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

      const redirectUrl = await this.adapter.getOAuth2RedirectUrl();

      res.status(200).send({ redirectUrl });
    } catch (error) {
      console.error("Could not get OAuth2 redirect URL:", error || "Unknown");
      next(error);
    }
  }

  public async oAuth2Callback(req: Request, res: Response): Promise<void> {
    let {
      OAUTH2_REDIRECT_URL: redirectUrl,
      OAUTH2_IDENTIFIER: oAuth2Identifier = "UNKNOWN",
    } = process.env;

    if (!redirectUrl) {
      console.error("OAuth2 Redirect URL not configured!");
      res.status(500).send("OAuth2 Redirect URL not configured!");
      return;
    }

    try {
      if (!this.adapter.handleOAuth2Callback) {
        throw new ServerError(501, "OAuth2 flow not implemented");
      }

      const { apiKey, apiUrl } = await this.adapter.handleOAuth2Callback(req);

      const params = stringify({
        name: oAuth2Identifier,
        key: apiKey,
        url: apiUrl,
      });

      res.redirect(`${redirectUrl}?${params}`);
    } catch (error) {
      console.error("Unable to save OAuth2 token:", error || "Unknown");
      res.redirect(redirectUrl);
    }
  }
}
