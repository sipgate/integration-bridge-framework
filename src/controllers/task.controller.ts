import { NextFunction, Response } from 'express';
import {
  Adapter,
  BridgeRequest,
  FollowUpWithIntegrationEntities,
} from '../models';
import { infoLogger } from '../util';

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
      infoLogger('getTasks', 'START', providerConfig.apiKey);

      const followUps = await this.adapter.getTasks(req, providerConfig);

      infoLogger(
        'getTasks',
        `Received ${followUps.length} follow ups`,
        providerConfig.apiKey,
      );

      infoLogger('getTasks', 'END', providerConfig.apiKey);
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
      infoLogger('createFollowUp', 'START', providerConfig.apiKey);

      const followUpId = await this.adapter.createFollowUp(
        providerConfig,
        req.body,
      );

      infoLogger(
        'createFollowUp',
        `Created followup with id ${followUpId}`,
        providerConfig.apiKey,
      );

      infoLogger('createFollowUp', 'END', providerConfig.apiKey);

      res.json({ followUpId });
    } catch (err) {
      next(err);
    }
  }

  async getTaskMetadata(
    req: BridgeRequest<void>,
    res: Response,
    next: NextFunction,
  ) {
    const { providerConfig } = req;

    if (!providerConfig) {
      next(new Error('Provider config not found'));
      return;
    }

    if (!this.adapter.getTaskMetadata) {
      next(new Error('Method not implemented'));
      return;
    }

    try {
      infoLogger('getTaskMetadata', 'START', providerConfig.apiKey);
      const metadata = await this.adapter.getTaskMetadata(req, providerConfig);

      infoLogger(
        'getTaskMetadata',
        `Found ${metadata.fields.length} fields for Task Object`,
        providerConfig.apiKey,
      );

      infoLogger('getTaskMetadata', 'END', providerConfig.apiKey);
      res.json(metadata);
    } catch (err) {
      next(err);
    }
  }
}
