import { IntegrationEntity } from './integration-entity.model';

export type FollowUpEvent = {
  content: string;
  dueAt: number;
  title: string;
  type: string;
};

export type FollowUpWithIntegrationEntities = FollowUpEvent & {
  integrationEntities: IntegrationEntity[];
};
