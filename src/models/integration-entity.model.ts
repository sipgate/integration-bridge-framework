export type IntegrationEntity = {
  id: string;
  name: string;
  type: IntegrationEntityType;
  source: string;
};

export type IntegrationEntityType = "deal" | "contact" | "company";
