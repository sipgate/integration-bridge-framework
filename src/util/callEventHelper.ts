import { startsWith } from 'lodash';
import {
  CallEvent,
  CallParticipantType,
  CallDirection,
  CallState,
} from '../models';

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
  const minutes = Math.floor(durationInMilliSeconds / 1000 / 60);
  const seconds = (durationInMilliSeconds / 1000) % 60;
  const unit = startsWith(locale, 'de') ? 'Minuten' : 'minutes';

  return `${minutes}:${seconds
    .toString()
    .padStart(2, '0')
    .substring(0, 2)} ${unit}`;
};

const getGermanTextDescriptionForCallEvent = (
  callEvent: CallEvent,
  locale: string,
): string => {
  const date = new Date(callEvent.startTime);

  const duration = formatDuration(
    callEvent.endTime ? callEvent.endTime - callEvent.startTime : 0,
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
    callEvent.state === CallState.CONNECTED
      ? 'Angenommener'
      : 'Nicht angenommener';
  const durationInfo =
    callEvent.state === CallState.CONNECTED ? `, Dauer: ${duration}` : '';
  const callDate = date.toLocaleString('de', { timeZone: 'Europe/Berlin' });
  const description = `${callState} ${directionInfo} Anruf ${callDescription} am ${callDate} Uhr${durationInfo}.`;

  return description;
};

const getEnglishTextDescriptionForCallEvent = (
  callEvent: CallEvent,
  locale: string,
): string => {
  const date = new Date(callEvent.startTime);
  const duration = formatDuration(
    callEvent.endTime ? callEvent.endTime - callEvent.startTime : 0,
    locale,
  );

  const directionInfo =
    callEvent.direction === CallDirection.IN ? 'incoming' : 'outgoing';

  const { from, to } = getCallMembers(callEvent);
  const fromDescription = from ? `from ${from}` : '';
  const toDescription = to ? `to ${to}` : '';

  const callDescription = `${fromDescription}${
    fromDescription && toDescription ? ' ' : ''
  }${toDescription}`;

  const callState =
    callEvent.state === CallState.CONNECTED ? 'Answered' : 'Unanswered';
  const durationInfo =
    callEvent.state === CallState.CONNECTED ? `, duration: ${duration}` : '';
  const callDate = date.toLocaleString('en', { timeZone: 'Europe/Berlin' });
  const description = `${callState} ${directionInfo} call ${callDescription} on ${callDate}${durationInfo}.`;

  return description;
};

export const getTextDescriptionForCallevent = (
  callEvent: CallEvent,
  locale: string = 'de-DE',
): string => {
  return startsWith(locale, 'de')
    ? getGermanTextDescriptionForCallEvent(callEvent, locale)
    : getEnglishTextDescriptionForCallEvent(callEvent, locale);
};
