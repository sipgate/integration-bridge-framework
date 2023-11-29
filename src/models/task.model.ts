export type Task = {
  id: string;
  content: string;
  createdAt: Date;
  dueAt: Date;
  link?: string;
  title: string;
};
