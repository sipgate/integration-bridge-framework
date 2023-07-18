import { CacheItemState } from './cache-item-state.model';
import { Contact } from './contact.model';

type FreshValueUpdater = (key: string) => Promise<Contact[]>;

export interface ContactCache {
  get: (
    key: string,
    getFreshValue?: FreshValueUpdater,
  ) => Promise<Contact[] | CacheItemState>;
  set: (key: string, value: Contact[]) => Promise<void>;
  delete: (key: string) => Promise<void>;
}
