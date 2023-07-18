export type IntegrationEntity = {
  id: string;
  type: IntegrationEntityType;
  source: string;
};

export type LabeledIntegrationEntity = IntegrationEntity & {
  label: string;
};

export type LoggedIntegrationEntity = IntegrationEntity & {
  logId: string;
};

export enum IntegrationEntityType {
  CONTACTS = 'contacts',
  // hubspot specific
  DEALS = 'deals',
  COMPANIES = 'companies',
  TICKETS = 'tickets',
  // salesforces specific
  LEADS = 'leads',
  ACCOUNTS = 'accounts',
  OPPORTUNITIES = 'opportunities',
  CASES = 'cases',
  // outlook specific
  CONTACTS_FOLDER = 'contacts-folder',
  // outlook and sipgate
  USERS = 'users',
}
