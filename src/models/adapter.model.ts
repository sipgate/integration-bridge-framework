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
} from ".";

export interface Adapter {
  getToken?: (config: Config) => Promise<{ apiKey: string }>;
  getContacts?: (config: Config) => Promise<Contact[]>;
  createContact?: (
    config: Config,
    contact: ContactTemplate
  ) => Promise<Contact>;
  updateContact?: (
    config: Config,
    id: string,
    contact: ContactUpdate
  ) => Promise<Contact>;
  deleteContact?: (config: Config, id: string) => Promise<void>;
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
    event: CallEvent
  ) => Promise<void>;
  deleteCalendarEvent?: (config: Config, id: string) => Promise<void>;
  handleCallEvent?: (
    config: Config,
    event: CallEvent
  ) => Promise<string | { refId: string; contactId?: string }>;
  handleConnectedEvent?: (config: Config) => Promise<void>;
  getHealth?: () => Promise<void>;
  getOAuth2RedirectUrl?: (req?: Request, res?: Response) => Promise<string>;
  handleOAuth2Callback?: (
    req: Request,
    res?: Response
  ) => Promise<{ apiKey: string; apiUrl: string }>;
}
