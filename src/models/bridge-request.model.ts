import { IntegrationEntityType } from "./integration-entity.model";
import { Request } from "express";
import { Config } from "./config.model";

export interface BridgeRequest extends Request {
  providerConfig?: Config;
}

export interface IntegrationEntityBridgeRequest extends BridgeRequest {
  params: { id: string; type: IntegrationEntityType };
}
