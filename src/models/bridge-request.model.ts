import { Request } from "express";
import { Config } from "./config.model";
import { UpdateCallEventBody } from "./call-event.model";

export interface BridgeRequest extends Request {
  providerConfig?: Config;
}

export interface UpdateCallEventBridgeRequest extends BridgeRequest {
  body: UpdateCallEventBody;
}
