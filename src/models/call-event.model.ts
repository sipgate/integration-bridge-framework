import { CallDirection } from "./";

export enum CallParticipantType {
  LOCAL = "local",
  REMOTE = "remote",
}

export type CallParticipant = {
  type: CallParticipantType;
  phoneNumber: string;
};

export enum CallStatus {
  BUSY = "BUSY",
  CONNECTED = "CONNECTED",
  MISSED = "MISSED",
  NOT_FOUND = "NOT_FOUND",
}

export interface CallEvent {
  id: string;
  startTime: number;
  endTime: number;
  direction: CallDirection;
  participants: CallParticipant[];
  note: string;
  status: CallStatus;
}
