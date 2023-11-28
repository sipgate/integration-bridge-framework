import { NextFunction, Response } from 'express';
import { Adapter, BridgeRequest, IntegrationEntity } from '../models';

type FollowUpType = 'call' | 'email' | 'meeting' | 'task' | 'note';

type FollowUpEvent = {
  note: string;
  type: FollowUpType;
  due: Date;
};

type FollowUpWithIntegrationEntities = FollowUpEvent & {
  integrationEntities: IntegrationEntity[];
};

export type Task = {
  title: string;
  note: string;
  due: Date;
  link: string;
};

export class TaskController {
  constructor(private readonly adapter: Adapter) {}

  async findAllByQuery(
    req: BridgeRequest<void>,
    res: Response,
    next: NextFunction,
  ) {
    const { providerConfig } = req;

    if (!providerConfig) {
      next(new Error('Provider config not found'));
      return;
    }

    if (!this.adapter.getTasks) {
      next(new Error('Method not implemented'));
      return;
    }

    try {
      const followUps = await this.adapter.getTasks(req);
      res.json(followUps);
    } catch (err) {
      next(err);
    }
  }

  async create(
    req: BridgeRequest<FollowUpWithIntegrationEntities>,
    res: Response,
    next: NextFunction,
  ) {
    const { providerConfig } = req;

    if (!providerConfig) {
      next(new Error('Provider config not found'));
      return;
    }

    if (!this.adapter.createFollowUp) {
      next(new Error('Method not implemented'));
      return;
    }

    try {
      const followUpId = await this.adapter.createFollowUp(req);
      res.json({ followUpId });
    } catch (err) {
      next(err);
    }
  }
}
