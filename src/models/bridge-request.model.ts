import { IntegrationEntityType } from './integration-entity.model';
import { Request } from 'express';
import { Config } from './config.model';

export interface BridgeRequest<BodyType> extends Request {
  providerConfig?: Config;
  body: BodyType;
}

export interface IdBridgeRequest<BodyType> extends BridgeRequest<BodyType> {
  params: { id: string };
}

export interface IntegrationEntityBridgeRequest extends BridgeRequest<unknown> {
  params: { id: string; type: IntegrationEntityType };
}
