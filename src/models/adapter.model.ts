import { Request, Response } from 'express';
import {
  CallEvent,
  CallEventWithIntegrationEntities,
  Config,
  Contact,
  ContactTemplate,
  ContactUpdate,
  FollowUpWithIntegrationEntities,
  IntegrationDefinedOptions,
  LabeledIntegrationEntity,
  LoggedIntegrationEntity,
  Task,
} from '.';
import { IntegrationEntityType } from './integration-entity.model';
import { IntegrationsEvent } from './integrations-event.model';

export interface Adapter {
  getToken?: (config: Config) => Promise<{ apiKey: string }>;
  isValidToken?: (config: Config) => Promise<boolean>;
  getAccountId?: (config: Config) => Promise<string>;
  getContact?: (
    config: Config,
    id: string,
    type: IntegrationEntityType,
  ) => Promise<Contact>;
  getContacts?: (config: Config) => Promise<Contact[]>;
  streamContacts?: (config: Config) => AsyncGenerator<Contact[], void, unknown>;
  createContact?: (
    config: Config,
    contact: ContactTemplate,
  ) => Promise<Contact>;
  updateContact?: (
    config: Config,
    id: string,
    contact: ContactUpdate,
  ) => Promise<Contact>;
  deleteContact?: (config: Config, id: string) => Promise<void>;
  /**
   * @deprecated handleCallEvent should be replaced by createOrUpdateCallLogForEntities
   */
  handleCallEvent?: (config: Config, event: CallEvent) => Promise<string>;
  /**
   * @deprecated updateCallEvent should be replaced by createOrUpdateCallLogForEntities
   */
  updateCallEvent?: (
    config: Config,
    id: string,
    event: CallEvent,
  ) => Promise<void>;
  createOrUpdateCallLogForEntities?: (
    config: Config,
    body: CallEventWithIntegrationEntities,
  ) => Promise<LoggedIntegrationEntity[]>;
  createCallLogForPhoneNumber?: (
    config: Config,
    body: CallEvent,
  ) => Promise<LoggedIntegrationEntity | null>;
  getCallLogMetadata?: (config: Config) => Promise<IntegrationDefinedOptions>;
  getEntity?: (
    providerConfig: Config,
    id: string,
    type: IntegrationEntityType,
  ) => Promise<LabeledIntegrationEntity | null>;
  getEntitiesForContact?: (
    config: Config,
    contactId: string,
  ) => Promise<LabeledIntegrationEntity[]>;
  handleConnectedEvent?: (config: Config) => Promise<void>;
  handleDisconnectedEvent?: (config: Config) => Promise<void>;
  getHealth?: () => Promise<void>;
  getOAuth2RedirectUrl?: (req?: Request, res?: Response) => Promise<string>;
  handleOAuth2Callback?: (
    req: Request,
    res?: Response,
  ) => Promise<{ apiKey: string; apiUrl: string }>;
  handleWebhook?: (req: Request) => Promise<IntegrationsEvent[]>;
  verifyWebhookRequest?: (req: Request) => Promise<boolean>;
  getTask?: (config: Config, id: string) => Promise<Task>;
  createFollowUp?: (
    config: Config,
    body: FollowUpWithIntegrationEntities,
  ) => Promise<string>;
  getTaskMetadata?: (config: Config) => Promise<IntegrationDefinedOptions>;
}
