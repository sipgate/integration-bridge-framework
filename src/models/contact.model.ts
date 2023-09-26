import {
  IntegrationEntity,
  IntegrationEntityType,
  LabeledIntegrationEntity,
} from './integration-entity.model';

export enum PhoneNumberLabel {
  WORK = 'WORK',
  MOBILE = 'MOBILE',
  HOME = 'HOME',
  HOMEFAX = 'HOMEFAX',
  WORKFAX = 'WORKFAX',
  OTHERFAX = 'OTHERFAX',
  PAGER = 'PAGER',
  WORKMOBILE = 'WORKMOBILE',
  WORKPAGER = 'WORKPAGER',
  MAIN = 'MAIN',
  GOOGLEVOICE = 'GOOGLEVOICE',
  OTHER = 'OTHER',
  DIRECTDIAL = 'DIRECTDIAL',
}

export enum PhoneNumberType {
  DIRECT_DIAL = 'DIRECT_DIAL',
  STANDARD = 'STANDARD',
}

export enum ContactDeltaType {
  CREATED,
  UPDATED,
  DELETED,
}

export type PhoneNumber = {
  label: PhoneNumberLabel | string;
  phoneNumber: string;
};

export type BaseContact = {
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  organization: string | null;
  type?: IntegrationEntityType;
};

export type ContactResult = {
  id: string;
  contactUrl: string | null;
  avatarUrl: string | null;
  readonly?: boolean;
  relatesTo?: IntegrationEntity[] | LabeledIntegrationEntity[];
};

export type ContactTemplate = BaseContact & {
  phoneNumbers: PhoneNumber[];
};

export type ContactUpdate = ContactTemplate & {
  id: string;
};

export type Contact = ContactTemplate & ContactResult;

export type ContactDelta = {
  type: ContactDeltaType;
  value: Contact | string;
};
