import { Contact } from "./contact.model";

export enum PubSubContactsState {
  "IN_PROGRESS",
  "COMPLETE",
}

export type PubSubContactsMessage = {
  userId: string;
  timestamp: number;
  contacts: Contact[];
  state: PubSubContactsState;
  integrationName: string;
};
