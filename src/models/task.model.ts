export type Task = {
  id: string;
  content: string;
  createdAt: number;
  dueAt: number;
  title: string;
  type: string;
  link?: string;
};
