import { IntegrationEntityType } from './integration-entity.model';

export enum IntegrationsEventType {
  CONTACT_CREATED = 'CONTACT_CREATED',
  CONTACT_UPDATED = 'CONTACT_UPDATED',
  CONTACT_DELETED = 'CONTACT_DELETED',
}

export type IntegrationsBaseEvent<T> = {
  type: T;
  accountId: string;
};

export type IntegrationsContactEvent = IntegrationsBaseEvent<
  | IntegrationsEventType.CONTACT_CREATED
  | IntegrationsEventType.CONTACT_UPDATED
  | IntegrationsEventType.CONTACT_DELETED
> & {
  contactId: string;
  contactType: IntegrationEntityType;
};

export type IntegrationsEvent = IntegrationsContactEvent;
