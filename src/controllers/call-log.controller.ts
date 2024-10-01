import { NextFunction, Response } from 'express';
import {
  Adapter,
  BridgeRequest,
  CallEvent,
  CallEventWithIntegrationEntities,
  ServerError,
} from '../models';
import { errorLogger, infoLogger } from '../util';
import { shouldSkipCallEvent } from '../util/call-event.util';

export class CallLogController {
  constructor(private readonly adapter: Adapter) {}

  public async createCallLogForPhoneNumber(
    req: BridgeRequest<CallEvent>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const { providerConfig } = req;

    try {
      infoLogger(
        'createCallLogForPhoneNumber',
        `START`,
        providerConfig?.apiKey,
      );

      if (!providerConfig) {
        throw new ServerError(400, 'Missing config parameters');
      }

      if (!this.adapter.createCallLogForPhoneNumber) {
        throw new ServerError(
          501,
          'Creating call log for phoneNumber is not implemented',
        );
      }

      if (shouldSkipCallEvent(req.body)) {
        infoLogger(
          'createCallLogForPhoneNumber',
          `Skipping call log for call id ${req.body.id}`,
          providerConfig.apiKey,
        );
        res.status(200).send(null);
        return;
      }

      infoLogger(
        'createCallLogForPhoneNumber',
        `Creating call Log for PhoneNumber…`,
        providerConfig.apiKey,
      );

      const loggedEntities = await this.adapter.createCallLogForPhoneNumber(
        providerConfig,
        req.body,
      );

      infoLogger('createCallLogForPhoneNumber', `END`, providerConfig.apiKey);
      res.status(200).send(loggedEntities);
    } catch (error) {
      errorLogger(
        'createCallLogForPhoneNumber',
        'Could not create call log for phoneNumber:',
        providerConfig?.apiKey,
        error || 'Unknown',
      );
      next(error);
    }
  }

  public async createOrUpdateCallLogsForEntities(
    req: BridgeRequest<CallEventWithIntegrationEntities>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const { providerConfig } = req;

    try {
      infoLogger(
        'createOrUpdateCallLogForEntities',
        `START`,
        providerConfig?.apiKey,
      );

      if (!providerConfig) {
        throw new ServerError(400, 'Missing config parameters');
      }

      if (!this.adapter.createOrUpdateCallLogForEntities) {
        throw new ServerError(
          501,
          'Updating call log with entities is not implemented',
        );
      }

      if (shouldSkipCallEvent(req.body)) {
        infoLogger(
          'createOrUpdateCallLogForEntities',
          `Skipping call log for call id ${req.body.id}`,
          providerConfig.apiKey,
        );
        res.status(200).send([]);
        return;
      }

      infoLogger(
        'createOrUpdateCallLogForEntities',
        `Creating and updating call Logs…`,
        providerConfig.apiKey,
      );

      const entitiesWithCallLogReferences =
        await this.adapter.createOrUpdateCallLogForEntities(
          providerConfig,
          req.body,
        );

      infoLogger(
        'createOrUpdateCallLogForEntities',
        `END`,
        providerConfig.apiKey,
      );
      res.status(200).send(entitiesWithCallLogReferences);
    } catch (error) {
      errorLogger(
        'createOrUpdateCallLogForEntities',
        'Could not update call logs with entities:',
        providerConfig?.apiKey,
        error || 'Unknown',
      );
      next(error);
    }
  }

  async getCallLogMetadata(
    req: BridgeRequest<void>,
    res: Response,
    next: NextFunction,
  ) {
    const { providerConfig } = req;

    if (!providerConfig) {
      next(new Error('Provider config not found'));
      return;
    }

    if (!this.adapter.getCallLogMetadata) {
      next(new Error('Method not implemented'));
      return;
    }

    try {
      infoLogger('getCallLogMetadata', 'START', providerConfig.apiKey);
      const metadata = await this.adapter.getCallLogMetadata(providerConfig);

      infoLogger(
        'getCallLogMetadata',
        `Found ${metadata.options?.length} options for Call Log Object`,
        providerConfig.apiKey,
      );

      infoLogger('getCallLogMetadata', 'END', providerConfig.apiKey);
      res.json(metadata);
    } catch (err) {
      next(err);
    }
  }
}
