export type IntegrationDefinedOptionsModel = {
  label: string;
  type: string;
  options?: {
    label: string;
    key: string;
  }[];
};
