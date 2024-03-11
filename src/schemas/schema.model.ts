export type ValidationSchema = {
  title: string;
  type: string;
  items: {
    type: string;
    properties: unknown;
    required: string[];
  };
};
