import { parsePhoneNumber } from "awesome-phonenumber";
import { PhoneNumber } from "../models";

const MIN_PHONE_NUMBER_LENGTH = 5;

export function convertPhoneNumberToE164(
  phoneNumber: string,
  locale: string
): string {
  const region = locale.replace(/.+_/, "").toUpperCase();

  try {
    const parsedPhoneNumber = parsePhoneNumber(phoneNumber, region);
    const e164 = parsedPhoneNumber.getNumber("e164");
    return e164 ?? phoneNumber;
  } catch {
    return phoneNumber;
  }
}

export const isDirectDial = (phoneNumber: PhoneNumber) => {
  return phoneNumber.phoneNumber.length < MIN_PHONE_NUMBER_LENGTH;
};
