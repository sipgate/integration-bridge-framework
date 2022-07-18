import { parsePhoneNumber } from "awesome-phonenumber";

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
