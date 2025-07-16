export type IntegrationEntity = {
  id: string;
  type: IntegrationEntityType;
  source: string;
};

export type LabeledIntegrationEntity<
  T extends IntegrationEntityType = IntegrationEntityType,
> = {
  id: string;
  type: T;
  source: string;
  label: string;
  additionalProperties?: AdditionalProperties[T];
};

type AdditionalProperties = {
  [IntegrationEntityType.DEALS]: {
    isOpen?: boolean;
  };
  [IntegrationEntityType.CONTACTS]?: never;
  [IntegrationEntityType.COMPANIES]?: never;
  [IntegrationEntityType.TICKETS]?: never;
  [IntegrationEntityType.LEADS]?: never;
  [IntegrationEntityType.ACCOUNTS]?: never;
  [IntegrationEntityType.OPPORTUNITIES]?: never;
  [IntegrationEntityType.CASES]?: never;
  [IntegrationEntityType.BUILDING_OBJECTS]?: never;
  [IntegrationEntityType.BUILDING_OBJECTS_LEADS]?: never;
  [IntegrationEntityType.CONTACTS_FOLDER]?: never;
  [IntegrationEntityType.USERS]?: never;
  [IntegrationEntityType.TASKS]?: never;
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
  // lignotrend-salesforce specific
  BUILDING_OBJECTS = 'building_objects',
  BUILDING_OBJECTS_LEADS = 'building_objects_leads',
  // outlook specific
  CONTACTS_FOLDER = 'contacts_folder',
  // outlook and sipgate
  USERS = 'users',
  //generic
  TASKS = 'tasks',
}
