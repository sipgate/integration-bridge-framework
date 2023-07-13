import { parsePhoneNumber as parse } from "awesome-phonenumber";
import { PhoneNumber, PhoneNumberType } from "../models";
import { APIPhoneNumber } from "../models/api-contact.model";

const MIN_PHONE_NUMBER_LENGTH = 5;

export const normalizePhoneNumber = (phoneNumber: string) =>
  phoneNumber.replace(/[^\d\w\+]/g, "");

export const parsePhoneNumber = (
  { label, phoneNumber }: PhoneNumber,
  locale: string,
  ignoreRegion = false
): APIPhoneNumber => {
  const isNumberDirectDial = isDirectDial(normalizePhoneNumber(phoneNumber));
  const type = isNumberDirectDial
    ? PhoneNumberType.DIRECT_DIAL
    : PhoneNumberType.STANDARD;
  try {
    const region = locale.replace("_", "-").replace(/.+-/, "").toUpperCase();
    const parsedPhoneNumber = parse(phoneNumber, region);
    const phoneNumberRegion = parsedPhoneNumber.getRegionCode();
    const e164 = parsedPhoneNumber.getNumber("e164") ?? phoneNumber;
    let newVar = {
      label,
      type,
      e164: isNumberDirectDial ? phoneNumber : e164,
      localized:
        ignoreRegion || region === phoneNumberRegion
          ? `0${parsedPhoneNumber.getNumber("national")}` ?? phoneNumber
          : parsedPhoneNumber.getNumber("international") ?? phoneNumber,
      phoneNumber: e164,
    };
    return newVar;
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
