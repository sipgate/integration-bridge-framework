import {
  CallDirection,
  CallEvent,
  CallParticipantType,
  CallState,
} from '../models';
import { getTextDescriptionForCallevent } from './callEventHelper';

const generateBaseCallEvent = (): CallEvent => ({
  id: 'callEventId123',
  startTime: 1705832625000,
  endTime: 1705833276000,
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
        'Angenommener eingehender Anruf von 4922199911122 auf 4921177722233 am 21.1.2024, 11:23:45 Uhr, Dauer: 10:51 Minuten.',
      );
    });

    it('should generate sane german text for outgoing, connected callEvent', () => {
      const callEvent = generateBaseCallEvent();
      callEvent.direction = CallDirection.OUT;

      expect(getTextDescriptionForCallevent(callEvent)).toEqual(
        'Angenommener ausgehender Anruf von 4921177722233 auf 4922199911122 am 21.1.2024, 11:23:45 Uhr, Dauer: 10:51 Minuten.',
      );
    });

    it('should generate sane german text for incoming, missed callEvent', () => {
      const callEvent = generateBaseCallEvent();
      callEvent.state = CallState.MISSED;

      expect(getTextDescriptionForCallevent(callEvent)).toEqual(
        'Nicht angenommener eingehender Anruf von 4922199911122 auf 4921177722233 am 21.1.2024, 11:23:45 Uhr.',
      );
    });

    it('should generate sane german text for outgoing, missed callEvent', () => {
      const callEvent = generateBaseCallEvent();
      callEvent.direction = CallDirection.OUT;
      callEvent.state = CallState.MISSED;

      expect(getTextDescriptionForCallevent(callEvent)).toEqual(
        'Nicht angenommener ausgehender Anruf von 4921177722233 auf 4922199911122 am 21.1.2024, 11:23:45 Uhr.',
      );
    });

    it('should generate sane german text for incoming, busy callEvent', () => {
      const callEvent = generateBaseCallEvent();
      callEvent.state = CallState.BUSY;

      expect(getTextDescriptionForCallevent(callEvent)).toEqual(
        'Nicht angenommener eingehender Anruf von 4922199911122 auf 4921177722233 am 21.1.2024, 11:23:45 Uhr.',
      );
    });

    it('should generate sane german text for outgoing, busy callEvent', () => {
      const callEvent = generateBaseCallEvent();
      callEvent.direction = CallDirection.OUT;
      callEvent.state = CallState.BUSY;

      expect(getTextDescriptionForCallevent(callEvent)).toEqual(
        'Nicht angenommener ausgehender Anruf von 4921177722233 auf 4922199911122 am 21.1.2024, 11:23:45 Uhr.',
      );
    });

    it('should generate sane german text for incoming, not_found callEvent', () => {
      const callEvent = generateBaseCallEvent();
      callEvent.state = CallState.NOT_FOUND;

      expect(getTextDescriptionForCallevent(callEvent)).toEqual(
        'Nicht angenommener eingehender Anruf von 4922199911122 auf 4921177722233 am 21.1.2024, 11:23:45 Uhr.',
      );
    });

    it('should generate sane german text for outgoing, not_found callEvent', () => {
      const callEvent = generateBaseCallEvent();
      callEvent.direction = CallDirection.OUT;
      callEvent.state = CallState.NOT_FOUND;

      expect(getTextDescriptionForCallevent(callEvent)).toEqual(
        'Nicht angenommener ausgehender Anruf von 4921177722233 auf 4922199911122 am 21.1.2024, 11:23:45 Uhr.',
      );
    });
  });
});
