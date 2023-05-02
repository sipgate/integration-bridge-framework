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
  CONTACTS = "contacts",
  // hubspot specific
  DEALS = "deals",
  COMPANIES = "companies",
  // salesforces specific
  LEADS = "leads",
  ACCOUNTS = "accounts",
  OPPORTUNITIES = "opportunities",
}
