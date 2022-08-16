import { CallDirection } from "./";

export enum CallParticipantType {
  LOCAL = "local",
  REMOTE = "remote",
}

export type CallParticipant = {
  type: CallParticipantType;
  phoneNumber: string;
};

export interface CallEvent {
  id: string;
  startTime: number;
  endTime: number;
  direction: CallDirection;
  participants: CallParticipant[];
  note: string;
}
