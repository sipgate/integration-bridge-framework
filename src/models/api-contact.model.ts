import {
  BaseContact,
  ContactResult,
  PhoneNumberLabel,
  PhoneNumberType,
} from './contact.model';

export interface APIPhoneNumber {
  label: PhoneNumberLabel | string;
  type: PhoneNumberType;
  e164: string;
  localized: string;
  rawNumber: string;
  isRawNumberValid: boolean;
}

export type APIContact = BaseContact &
  ContactResult & {
    phoneNumbers: APIPhoneNumber[];
  };
