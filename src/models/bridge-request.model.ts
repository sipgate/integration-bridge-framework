import { Request } from 'express';
import { Config } from './config.model';
import { IntegrationEntityType } from './integration-entity.model';

export interface BridgeRequest<BodyType> extends Request {
  providerConfig?: Config;
  body: BodyType;
}

export interface IdBridgeRequest<BodyType> extends BridgeRequest<BodyType> {
  params: { id: string };
}

export interface BridgeRequestWithTimestamp extends BridgeRequest<unknown> {
  params: { timestamp: string };
}

export interface IntegrationEntityBridgeRequest extends BridgeRequest<unknown> {
  params: { id: string; type: IntegrationEntityType };
}

export interface IntegrationEntitiesBridgeRequest
  extends BridgeRequest<unknown> {
  params: { id: string };
}
