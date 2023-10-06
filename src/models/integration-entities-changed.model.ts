import { IntegrationEntityType } from './integration-entity.model';

export type IntegrationEntitiesChangedData = {
  integrationName: string;
  data: {
    integrationAccountId: string;
    type: 'UPDATE' | 'CREATE' | 'DELETE';
    objectId: string;
    integrationEntityType: IntegrationEntityType;
  }[];
};
