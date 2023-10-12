import { ContactChangeEvent } from './contact-change-event.model';

export type PubSubContactChangeEventMessage = {
  integrationName: string;
} & ContactChangeEvent;
