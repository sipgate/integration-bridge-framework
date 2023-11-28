import { NextFunction, Response } from 'express';
import {
  Adapter,
  BridgeRequest,
  FollowUpWithIntegrationEntities,
} from '../models';

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
      const followUps = await this.adapter.getTasks(req, providerConfig);
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
      const followUpId = await this.adapter.createFollowUp(
        providerConfig,
        req.body,
      );
      res.json({ followUpId });
    } catch (err) {
      next(err);
    }
  }
}
