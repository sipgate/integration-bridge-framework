export type ContactsChangedData = {
  integrationName: string;
  data: {
    integrationAccountId: string;
    type: ContactsChangedDataType;
    contactId: string;
  }[];
};

export type ContactsChangedDataType = 'UPDATE' | 'CREATE' | 'DELETE';
