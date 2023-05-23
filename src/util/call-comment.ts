import { CallDirection, CallState } from "../models";
import moment from "moment";

export function getCommentTitle(
  state: CallState,
  direction: CallDirection,
  locale: string,
  htmlOpen = "",
  htmlClose = ""
) {
  const isGerman = locale.startsWith("de");
  const isIncoming = direction == CallDirection.IN;
  const directionString = isGerman
    ? isIncoming
      ? "eingehender"
      : "ausgehender"
    : isIncoming
    ? "incoming"
    : "outgoing";

  const titleEndGerman = `${directionString} Anruf (CLINQ)`;
  const titleEndEnglish = `${directionString} Call (CLINQ)`;

  switch (state) {
    case CallState.CONNECTED:
      return isGerman
        ? `${htmlOpen}Getätigter ${titleEndGerman}${htmlClose}`
        : `${htmlOpen}Connected ${titleEndEnglish}${htmlClose}`;
    case CallState.BUSY:
      return isGerman
        ? `${htmlOpen}Nicht angenommener ${titleEndGerman}${htmlClose}`
        : `${htmlOpen}Busy ${titleEndEnglish}${htmlClose}`;
    case CallState.MISSED:
      return isGerman
        ? `${htmlOpen}Verpasster ${titleEndGerman}${htmlClose}`
        : `${htmlOpen}Missed ${titleEndEnglish}${htmlClose}`;
    default:
      return isGerman
        ? `${htmlOpen}Getätigter ${titleEndGerman}${htmlClose}`
        : `${htmlOpen}Connected ${titleEndEnglish}${htmlClose}`;
  }
}

function createCallEventCommentHeader(locale: string) {
  const isGerman = locale.startsWith("de");
  return `<h1>${isGerman ? "Notizen" : "Note"} (CLINQ):</h1>`;
}

export function getCommentContent(note: string, locale: string) {
  return `${createCallEventCommentHeader(locale)}${note}`;
}

export function getCallDuration(
  startTime: number,
  endTime: number,
  locale: string
) {
  const start = moment(startTime);
  const end = moment(endTime);

  const diff = end.diff(start);

  return `${locale.startsWith("de") ? "Dauer" : "Duration"}: ${moment
    .utc(diff)
    .format("HH:mm:ss")}`;
}