import { Router } from "express";

export type CustomRouter = {
  path: string;
  router: Router;
};
