import { Contact, IntegrationEntityType } from '../models';
import { sanitizeContact } from './contact.util';

describe('ContactUtil', () => {
  describe('sanitizeContact', () => {
    it('should return only one of two same relations', () => {
      const mockContact = {
        firstName: 'firstName',
        lastName: 'lastName',
        email: 'email',
        phoneNumbers: [],
        relatesTo: [
          {
            type: IntegrationEntityType.DEALS,
            id: '345',
            source: 'HUBSPOT',
          },
          {
            type: IntegrationEntityType.DEALS,
            id: '345',
            source: 'HUBSPOT',
          },
        ],
      } as unknown as Contact;

      expect(sanitizeContact(mockContact, 'de-DE').relatesTo).toEqual([
        {
          type: IntegrationEntityType.DEALS,
          id: '345',
          source: 'HUBSPOT',
        },
      ]);
    });

    it('should return both one of two similar relations with different source', () => {
      const mockContact = {
        firstName: 'firstName',
        lastName: 'lastName',
        email: 'email',
        phoneNumbers: [],
        relatesTo: [
          {
            type: IntegrationEntityType.DEALS,
            id: '345',
            source: 'HUBSPOT',
          },
          {
            type: IntegrationEntityType.DEALS,
            id: '345',
            source: 'PIPEDRIVE',
          },
        ],
      } as unknown as Contact;

      expect(sanitizeContact(mockContact, 'de-DE').relatesTo).toEqual([
        {
          type: IntegrationEntityType.DEALS,
          id: '345',
          source: 'HUBSPOT',
        },
        {
          type: IntegrationEntityType.DEALS,
          id: '345',
          source: 'PIPEDRIVE',
        },
      ]);
    });
    it('should return all unique relations', () => {
      const mockContact = {
        firstName: 'firstName',
        lastName: 'lastName',
        email: 'email',
        phoneNumbers: [],
        relatesTo: [
          {
            type: IntegrationEntityType.DEALS,
            id: '345',
            source: 'HUBSPOT',
          },
          {
            type: IntegrationEntityType.CONTACTS,
            id: '678',
            source: 'HUBSPOT',
          },
          {
            type: IntegrationEntityType.DEALS,
            id: '345',
            source: 'PIPEDRIVE',
          },
          {
            type: IntegrationEntityType.DEALS,
            id: '345',
            source: 'PIPEDRIVE',
          },
        ],
      } as unknown as Contact;

      expect(sanitizeContact(mockContact, 'de-DE').relatesTo).toEqual([
        {
          type: IntegrationEntityType.DEALS,
          id: '345',
          source: 'HUBSPOT',
        },
        {
          type: IntegrationEntityType.CONTACTS,
          id: '678',
          source: 'HUBSPOT',
        },
        {
          type: IntegrationEntityType.DEALS,
          id: '345',
          source: 'PIPEDRIVE',
        },
      ]);
    });

    it('should return full name if name is not set', () => {
      const mockContact = {
        firstName: 'firstName',
        lastName: 'lastName',
        email: 'email',
        phoneNumbers: [],
        relatesTo: [],
      } as unknown as Contact;

      expect(sanitizeContact(mockContact, 'de-DE').name).toEqual(
        'firstName lastName',
      );
    });
  });
});
