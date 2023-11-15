import { APIContact, Contact } from '../models';
import { parsePhoneNumber } from './phone-number-utils';
import { isEqual, uniqWith } from 'lodash';

export function getFullName(item: {
  firstName: string | null | undefined;
  lastName: string | null | undefined;
  name: string | null | undefined;
}) {
  if (!item) {
    return null;
  }

  if (item.firstName && item.lastName) {
    return `${item.firstName} ${item.lastName}`;
  }

  if (item.firstName && !item.lastName) {
    return `${item.firstName}`;
  }

  if (!item.firstName && item.lastName) {
    return `${item.lastName}`;
  }

  return item.name ?? null;
}

export function sanitizeContact(contact: Contact, locale: string): Contact {
  const result: APIContact = {
    ...contact,
    phoneNumbers: contact.phoneNumbers.map((phoneNumber) =>
      parsePhoneNumber(phoneNumber, locale),
    ),
    relatesTo: contact.relatesTo
      ? uniqWith(contact.relatesTo, isEqual)
      : undefined,
  };
  return result;
}
