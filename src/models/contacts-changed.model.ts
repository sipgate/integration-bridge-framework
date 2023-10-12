import { IntegrationEntityType } from './integration-entity.model';

export type ContactChangeEvent = {
  accountId: string;
  changeType: ContactChangeEventType;
  contactId: string;
  contactType: IntegrationEntityType;
};

export enum ContactChangeEventType {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  DELETED = 'DELETED',
}
