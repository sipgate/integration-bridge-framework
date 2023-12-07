export type Task = {
  id: string;
  content: string;
  createdAt: Date;
  dueAt: Date;
  link?: string;
  title: string;
};

export type TaskMetadata = {
  fields: {
    label: string;
    key: string;
    type: string;
    options?: string[];
  }[];
};
