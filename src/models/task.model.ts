export type Task = {
  id: string;
  content: string;
  createdAt: Date;
  dueAt: Date;
  title: string;
  type: string;
  link?: string;
};
