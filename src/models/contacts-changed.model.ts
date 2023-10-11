import { IntegrationEntityType } from './integration-entity.model';

export type ContactsChangedData = {
  integrationName: string;
  data: {
    integrationAccountId: string;
    type: ContactsChangedDataType;
    contactId: string;
    contactType: IntegrationEntityType;
  }[];
};

export enum ContactsChangedDataType {
  UPDATE = 'UPDATE',
  CREATE = 'CREATE',
  DELETE = 'DELETE',
}
