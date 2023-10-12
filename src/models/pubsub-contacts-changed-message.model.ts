import { ContactChangeEvent } from './contacts-changed.model';

export type PubSubContactChangeEventMessage = {
  integrationName: string;
} & ContactChangeEvent;
