import { Contact } from '../contact.model';

export enum PubSubContactsState {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETE = 'COMPLETE',
  FAILED = 'FAILED',
}

export type PubSubContactsMessage = {
  userId: string;
  timestamp: number;
  contacts: Contact[];
  state: PubSubContactsState;
  integrationName: string;
  traceparent?: string;
};
