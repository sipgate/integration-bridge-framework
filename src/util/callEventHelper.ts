import { startsWith } from 'lodash';
import { CallEvent, CallParticipantType, CallDirection } from '../models';

export interface CallMembers {
  from: string | undefined;
  to: string | undefined;
}

export const getCallMembers = (event: CallEvent): CallMembers => {
  const localParticipant = event.participants.find(
    (item) => item.type === CallParticipantType.LOCAL,
  );
  const remoteParticipant = event.participants.find(
    (item) => item.type === CallParticipantType.REMOTE,
  );

  const to =
    event.direction === CallDirection.OUT
      ? remoteParticipant?.phoneNumber
      : localParticipant?.phoneNumber;
  const from =
    event.direction === CallDirection.IN
      ? remoteParticipant?.phoneNumber
      : localParticipant?.phoneNumber;

  return { from, to };
};

const formatDuration = (
  durationInMilliSeconds: number,
  locale: string,
): string => {
  const minutes = Math.floor(durationInMilliSeconds / (60 * 1000));
  const seconds = Math.floor((durationInMilliSeconds - minutes * 60) / 1000)
    .toString()
    .padStart(2, '0')
    .substring(0, 2);
  const unit = startsWith(locale, 'de') ? 'Minuten' : 'minutes';

  return `${minutes}:${seconds} ${unit}`;
};

export const getTextDescriptionForCallevent = (
  callEvent: CallEvent,
  locale: string = 'de-DE',
): string => {
  const useGerman = startsWith(locale, 'de');

  const date = new Date(callEvent.startTime);
  const duration = formatDuration(
    callEvent.endTime - callEvent.startTime,
    locale,
  );
  const directionInfo =
    callEvent.direction === CallDirection.IN ? 'eingehender' : 'ausgehender';
  const { from, to } = getCallMembers(callEvent);
  const fromDescription = from ? `von ${from}` : '';
  const toDescription = to ? `auf ${to}` : '';
  const callDescription = `${fromDescription}${
    fromDescription && toDescription ? ' ' : ''
  }${toDescription}`;
  const callState =
    callEvent.state === 'MISSED' ? 'Nicht angenommener' : 'Angenommener';
  const durationInfo =
    callEvent.state === 'MISSED' ? '' : `, Dauer: ${duration}`;
  const callDate = date.toLocaleString('de', { timeZone: 'Europe/Berlin' });
  const description = `${callState} ${directionInfo} Anruf ${callDescription} ${
    useGerman ? 'am' : 'at'
  } ${callDate}${useGerman ? ' Uhr' : ''}${durationInfo}.`;

  return description;
};
