import { Request, Response } from "express";
import {
  CalendarEvent,
  CalendarEventTemplate,
  CalendarFilterOptions,
  CallEvent,
  CallEventWithIntegrationEntities,
  Config,
  Contact,
  ContactTemplate,
  ContactUpdate,
  LabeledIntegrationEntity,
  LoggedIntegrationEntity,
} from ".";
import { IntegrationEntityType } from "./integration-entity.model";

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
  handleCallEvent?: (config: Config, event: CallEvent) => Promise<string>;
  createCallLogsForEntities?: (
    config: Config,
    event: CallEventWithIntegrationEntities
  ) => Promise<LoggedIntegrationEntity[]>;
  getEntity?: (
    providerConfig: Config,
    id: string,
    type: IntegrationEntityType
  ) => Promise<LabeledIntegrationEntity | null>;
  handleConnectedEvent?: (config: Config) => Promise<void>;
  getHealth?: () => Promise<void>;
  getOAuth2RedirectUrl?: (req?: Request, res?: Response) => Promise<string>;
  handleOAuth2Callback?: (
    req: Request,
    res?: Response
  ) => Promise<{ apiKey: string; apiUrl: string }>;
}
