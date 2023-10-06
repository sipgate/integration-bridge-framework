export type ContactsChangedData = {
  integrationName: string;
  data: {
    integrationAccountId: string;
    type: 'UPDATE' | 'CREATE' | 'DELETE';
    contactId: string;
  }[];
};
