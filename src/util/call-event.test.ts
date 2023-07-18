import {
  CallDirection,
  CallEvent,
  CallParticipantType,
  CallState,
} from '../models';
import { shouldSkipCallEvent } from './call-event.util';

describe('shouldSkipCallEvent', () => {
  it('should return false if the call event has no remote participant', () => {
    const callEvent: CallEvent = {
      participants: [
        {
          type: CallParticipantType.LOCAL,
          phoneNumber: '1234567890',
        },
      ],
      id: '',
      startTime: 0,
      endTime: 0,
      direction: CallDirection.IN,
      note: '',
      state: CallState.BUSY,
    };

    expect(shouldSkipCallEvent(callEvent)).toBe(false);
  });

  it('should return false if the call event has no direct dial', () => {
    const callEvent: CallEvent = {
      participants: [
        {
          type: CallParticipantType.LOCAL,
          phoneNumber: '1234567890',
        },
        {
          type: CallParticipantType.REMOTE,
          phoneNumber: '1234567890',
        },
      ],
      id: '',
      startTime: 0,
      endTime: 0,
      direction: CallDirection.IN,
      note: '',
      state: CallState.BUSY,
    };

    expect(shouldSkipCallEvent(callEvent)).toBe(false);
  });

  it('should return false if the call event has a direct dial with the local party', () => {
    const callEvent: CallEvent = {
      participants: [
        {
          type: CallParticipantType.LOCAL,
          phoneNumber: '13',
        },
        {
          type: CallParticipantType.REMOTE,
          phoneNumber: '1234567890',
        },
      ],
      id: '',
      startTime: 0,
      endTime: 0,
      direction: CallDirection.IN,
      note: '',
      state: CallState.BUSY,
    };

    expect(shouldSkipCallEvent(callEvent)).toBe(false);
  });

  it('should return true if the call is with a remote direct dial', () => {
    const callEvent: CallEvent = {
      participants: [
        {
          type: CallParticipantType.LOCAL,
          phoneNumber: '1234567890',
        },
        {
          type: CallParticipantType.REMOTE,
          phoneNumber: '13',
        },
      ],
      id: '',
      startTime: 0,
      endTime: 0,
      direction: CallDirection.IN,
      note: '',
      state: CallState.BUSY,
    };

    expect(shouldSkipCallEvent(callEvent)).toBe(true);
  });
});
