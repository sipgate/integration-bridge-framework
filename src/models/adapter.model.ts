import { Request, Response } from "express";
import {
  CalendarEvent,
  CalendarEventTemplate,
  CalendarFilterOptions,
  CallEvent,
  Config,
  Contact,
  ContactTemplate,
  ContactUpdate,
  UpdateCallEventBody,
} from ".";

export interface Adapter {
  getToken?: (config: Config) => Promise<{ apiKey: string }>;
  getContacts?: (
    config: Config,
    req?: Request,
    res?: Response
  ) => Promise<Contact[]>;
  createContact?: (
    config: Config,
    contact: ContactTemplate,
    req?: Request,
    res?: Response
  ) => Promise<Contact>;
  updateContact?: (
    config: Config,
    id: string,
    contact: ContactUpdate,
    req?: Request,
    res?: Response
  ) => Promise<Contact>;
  deleteContact?: (
    config: Config,
    id: string,
    req?: Request,
    res?: Response
  ) => Promise<void>;
  getCalendarEvents?: (
    config: Config,
    options?: CalendarFilterOptions | null
  ) => Promise<CalendarEvent[]>;
  createCalendarEvent?: (
    config: Config,
    event: CalendarEventTemplate
  ) => Promise<CalendarEvent>;
  updateCalendarEvent?: (
    config: Config,
    id: string,
    event: CalendarEventTemplate
  ) => Promise<CalendarEvent>;
  updateCallEvent?: (
    config: Config,
    id: string,
    event: UpdateCallEventBody
  ) => Promise<void>;
  deleteCalendarEvent?: (config: Config, id: string) => Promise<void>;
  handleCallEvent?: (config: Config, event: CallEvent) => Promise<string>;
  handleConnectedEvent?: (config: Config) => Promise<void>;
  getHealth?: () => Promise<void>;
  getOAuth2RedirectUrl?: (req?: Request, res?: Response) => Promise<string>;
  handleOAuth2Callback?: (
    req: Request,
    res?: Response
  ) => Promise<{ apiKey: string; apiUrl: string }>;
}
