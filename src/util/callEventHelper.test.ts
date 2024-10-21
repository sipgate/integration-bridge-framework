import {
  CallDirection,
  CallEvent,
  CallParticipantType,
  CallState,
} from '../models';
import { getTextDescriptionForCallevent } from './callEventHelper';

const generateBaseCallEvent = (): CallEvent => ({
  id: 'callEventId123',
  startTime: 1704103200000,
  endTime: 1704105000000,
  direction: CallDirection.IN,
  participants: [
    {
      type: CallParticipantType.LOCAL,
      phoneNumber: '4921177722233',
    },
    {
      type: CallParticipantType.REMOTE,
      phoneNumber: '4922199911122',
    },
  ],
  note: 'testnote01',
  state: CallState.CONNECTED,
});

describe('callEventHelper', () => {
  describe('getTextDescriptionForCallevent', () => {
    it('should generate sane german text for incoming, connected callEvent', () => {
      const callEvent = generateBaseCallEvent();

      expect(getTextDescriptionForCallevent(callEvent)).toEqual(
        'Angenommener eingehender Anruf von 4922199911122 auf 4921177722233 am 1.1.2024, 11:00:00 Uhr, Dauer: 30:17 Minuten.',
      );
    });

    it('should generate sane german text for outgoing, connected callEvent', () => {
      const callEvent = generateBaseCallEvent();
      callEvent.direction = CallDirection.OUT;

      expect(getTextDescriptionForCallevent(callEvent)).toEqual(
        'Angenommener ausgehender Anruf von 4921177722233 auf 4922199911122 am 1.1.2024, 11:00:00 Uhr, Dauer: 30:17 Minuten.',
      );
    });

    it('should generate sane german text for incoming, missed callEvent', () => {
      const callEvent = generateBaseCallEvent();
      callEvent.state = CallState.MISSED;

      expect(getTextDescriptionForCallevent(callEvent)).toEqual(
        'Nicht angenommener eingehender Anruf von 4922199911122 auf 4921177722233 am 1.1.2024, 11:00:00 Uhr.',
      );
    });

    it('should generate sane german text for outgoing, missed callEvent', () => {
      const callEvent = generateBaseCallEvent();
      callEvent.direction = CallDirection.OUT;
      callEvent.state = CallState.MISSED;

      expect(getTextDescriptionForCallevent(callEvent)).toEqual(
        'Nicht angenommener ausgehender Anruf von 4921177722233 auf 4922199911122 am 1.1.2024, 11:00:00 Uhr.',
      );
    });
  });
});
