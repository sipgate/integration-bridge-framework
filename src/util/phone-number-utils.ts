import { parsePhoneNumber as parse } from "awesome-phonenumber";
import { PhoneNumber, PhoneNumberType } from "../models";
import { APIPhoneNumber } from "../models/api-contact.model";

const MIN_PHONE_NUMBER_LENGTH = 5;

export const normalizePhoneNumber = (phoneNumber: string) =>
  phoneNumber.replace(/[^\d\w\+]/g, "");

export const parsePhoneNumber = (
  { label, phoneNumber }: PhoneNumber,
  locale: string
): APIPhoneNumber => {
  const type = isDirectDial(normalizePhoneNumber(phoneNumber))
    ? PhoneNumberType.DIRECT_DIAL
    : PhoneNumberType.STANDARD;
  try {
    const region = locale.replace("_", "-").replace(/.+-/, "").toUpperCase();
    const parsed = parse(phoneNumber, region);
    const e164 = parsed.getNumber("e164") ?? phoneNumber;
    return {
      label,
      type,
      e164,
      localized: parsed.getNumber("national") ?? phoneNumber,
      phoneNumber: e164,
    };
  } catch {
    return {
      label,
      type,
      e164: phoneNumber,
      localized: phoneNumber,
      phoneNumber: phoneNumber,
    };
  }
};

export const isDirectDial = (phoneNumber: string) => {
  return phoneNumber.length < MIN_PHONE_NUMBER_LENGTH;
};
