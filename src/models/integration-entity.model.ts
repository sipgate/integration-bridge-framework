export type IntegrationEntity = {
  id: string;
  type: IntegrationEntityType;
  source: string;
};

export type LabeledIntegrationEntity = IntegrationEntity & {
  label: string;
};

export type LoggedIntegrationEntity = IntegrationEntity & {
  logId: string; // ID of CallLog-Object in CRM (can be present in several integration entities)
};

export enum IntegrationEntityType {
  DEALS = "deals",
  COMPANIES = "companies",
  CONTACTS = "contacts",
}
