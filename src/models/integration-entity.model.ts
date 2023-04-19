export type IntegrationEntity = {
  id: string;
  type: IntegrationEntityType;
  source: string;
};

export type LabeledIntegrationEntity = IntegrationEntity & {
  label: string;
};

export enum IntegrationEntityType {
  DEALS = "deals",
  COMPANIES = "companies",
}
