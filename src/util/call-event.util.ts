import { CallEvent, CallParticipantType } from '../models';
import { isDirectDial } from './phone-number-utils';

export function shouldSkipCallEvent(event: CallEvent) {
  return event.participants.some(
    (participant) =>
      participant.type === CallParticipantType.REMOTE &&
      isDirectDial(participant.phoneNumber),
  );
}
