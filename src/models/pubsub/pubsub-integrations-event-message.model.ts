import { IntegrationsEvent } from '../integrations-event.model';

export type PubSubIntegrationsEventMessage = {
  integrationName: string;
} & IntegrationsEvent;
