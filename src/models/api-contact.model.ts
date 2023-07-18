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

  /**
   * @deprecated
   * use 'e164' and 'localized' instead
   */
  phoneNumber: string;
}

export type APIContact = BaseContact &
  ContactResult & {
    phoneNumbers: APIPhoneNumber[];
  };
