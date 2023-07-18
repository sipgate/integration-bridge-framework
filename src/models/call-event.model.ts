import { CallDirection, IntegrationEntity, LoggedIntegrationEntity } from './';

/**
 * The type of the call participant.
 * The remote party is the party that is not the user.
 * Unless you really need the local party,
 *  you should use the remote party since it also contains the correct phone number of the call.
 */
export enum CallParticipantType {
  LOCAL = 'local',
  REMOTE = 'remote',
}

export type CallParticipant = {
  type: CallParticipantType;
  phoneNumber: string;
};

export enum CallState {
  BUSY = 'BUSY',
  CONNECTED = 'CONNECTED',
  MISSED = 'MISSED',
  NOT_FOUND = 'NOT_FOUND',
}

export interface CallEvent {
  id: string;
  startTime: number;
  endTime: number;
  direction: CallDirection;
  participants: CallParticipant[];
  note: string;
  state: CallState;
}

export interface CallEventWithIntegrationEntities extends CallEvent {
  integrationEntities: (IntegrationEntity | LoggedIntegrationEntity)[];
}
