import { parsePhoneNumber as parse } from 'awesome-phonenumber';
import { APIPhoneNumber, PhoneNumber, PhoneNumberType } from '../models';
import { errorLogger } from './logger.util';

const MIN_PHONE_NUMBER_LENGTH = 5;

export const normalizePhoneNumber = (phoneNumber: string) =>
  phoneNumber.replace(/[^\d\w+]/g, '');

export const parsePhoneNumber = (
  { label, phoneNumber }: PhoneNumber,
  locale: string,
  ignoreRegion = false,
): APIPhoneNumber => {
  const isNumberDirectDial = isDirectDial(normalizePhoneNumber(phoneNumber));
  const type = isNumberDirectDial
    ? PhoneNumberType.DIRECT_DIAL
    : PhoneNumberType.STANDARD;

  try {
    const region = locale.replace('_', '-').replace(/.+-/, '').toUpperCase();
    const parsedPhoneNumber = parse(phoneNumber, {
      regionCode: region,
    });

    const nationalNumber = parsedPhoneNumber.number?.national;

    const phoneNumberRegion = parsedPhoneNumber.regionCode;
    const e164 = parsedPhoneNumber.number?.e164 ?? phoneNumber;

    return {
      label,
      type,
      e164: parsedPhoneNumber.valid ? e164 : phoneNumber,
      localized:
        ignoreRegion || region === phoneNumberRegion
          ? nationalNumber ?? phoneNumber
          : parsedPhoneNumber.number?.international ?? phoneNumber,
      rawNumber: phoneNumber,
      isRawNumberValid: parsedPhoneNumber.valid,
    };
  } catch {
    errorLogger(
      'parsePhoneNumber',
      'could not split into localized and e164, returning plain phonenumber',
      '...',
      { phoneNumber },
    );

    return {
      label,
      type,
      e164: phoneNumber,
      localized: phoneNumber,
      rawNumber: phoneNumber,
      isRawNumberValid: false,
    };
  }
};

export const isDirectDial = (phoneNumber: string) => {
  return phoneNumber.length < MIN_PHONE_NUMBER_LENGTH;
};
