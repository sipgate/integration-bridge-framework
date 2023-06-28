import { Contact } from "./contact.model";

export type PubSubContactsMessage = {
  userId: string;
  timestamp: number;
  contacts: Contact[];
};
