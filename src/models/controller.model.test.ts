import { Request, Response } from 'express';
import {
  MockRequest,
  MockResponse,
  createRequest,
  createResponse,
} from 'node-mocks-http';
import {
  CallDirection,
  CallEvent,
  CallParticipantType,
  CallState,
  Contact,
  Controller,
} from '.';
import { ContactCacheStorage } from '../cache';
import { MemoryStorageAdapter } from '../cache/storage';
import { APIContact } from './api-contact.model';
import { BridgeRequest } from './bridge-request.model';
import { PhoneNumberLabel, PhoneNumberType } from './contact.model';

const contactsMock: APIContact[] = [
  {
    id: 'abc123',
    name: 'Walter Geoffrey',
    firstName: null,
    lastName: null,
    email: 'walter@example.com',
    organization: 'Rocket Science Inc.',
    contactUrl: 'http://myapp.com/contacts/abc123',
    avatarUrl: 'http://myapp.com/avatar/abc123.png',
    phoneNumbers: [
      {
        label: PhoneNumberLabel.MOBILE,
        type: PhoneNumberType.STANDARD,
        phoneNumber: '+4915791234567',
        e164: '+4915791234567',
        localized: '01579 1234567',
      },
    ],
  },
];

const contactsReadonlyMock: APIContact[] = [
  {
    id: 'abc123',
    name: 'Walter Geoffrey',
    firstName: null,
    lastName: null,
    email: 'walter@example.com',
    organization: 'Rocket Science Inc.',
    contactUrl: 'http://myapp.com/contacts/abc123',
    avatarUrl: 'http://myapp.com/avatar/abc123.png',
    phoneNumbers: [
      {
        label: PhoneNumberLabel.MOBILE,
        type: PhoneNumberType.STANDARD,
        phoneNumber: '+4915791234567',
        e164: '+4915791234567',
        localized: '01579 1234567',
      },
    ],
    readonly: true,
  },
];

const contactsMinimumMock: APIContact[] = [
  {
    id: '123',
    email: null,
    name: null,
    firstName: null,
    lastName: null,
    organization: null,
    contactUrl: null,
    avatarUrl: null,
    phoneNumbers: [
      {
        label: PhoneNumberLabel.WORK,
        type: PhoneNumberType.STANDARD,
        phoneNumber: '+4915791234567',
        e164: '+4915791234567',
        localized: '01579 1234567',
      },
    ],
  },
];

const contactsWithMissingField: Partial<Contact>[] = [
  {
    id: '123',
    name: null,
    firstName: null,
    lastName: null,
    organization: null,
    contactUrl: null,
    avatarUrl: null,
    phoneNumbers: [
      {
        label: PhoneNumberLabel.WORK,
        phoneNumber: '+4915799912345',
      },
    ],
  },
];

const ERROR_MESSAGE: string = 'Error!';

console.log = jest.fn();
jest.useFakeTimers();

describe('controller.model tests', () => {
  describe('getContacts', () => {
    let request: MockRequest<BridgeRequest<unknown>>;
    let response: MockResponse<Response>;
    let next: jest.Mock;

    beforeAll(() => {
      process.env.OAUTH2_REDIRECT_URL = 'http://example.com';
      process.env.OAUTH2_IDENTIFIER = 'TEST';
    });

    beforeEach(() => {
      request = createRequest({
        providerConfig: {
          apiKey: 'a1b2c3',
          apiUrl: 'http://example.com',
          locale: 'de_DE',
        },
      });
      response = createResponse();
      next = jest.fn();
    });

    it('should handle contacts', async () => {
      const controller: Controller = new Controller(
        {
          getContacts: () => Promise.resolve(contactsMock),
        },
        new ContactCacheStorage(new MemoryStorageAdapter()),
      );

      await controller.getContacts(request, response, next);

      const data: Contact[] = response._getData();

      expect(next).not.toBeCalled();
      expect(data).toEqual(contactsMock);
    });

    it('should handle readonly contacts', async () => {
      const controller: Controller = new Controller(
        {
          getContacts: () => Promise.resolve(contactsReadonlyMock),
        },
        new ContactCacheStorage(new MemoryStorageAdapter()),
      );

      await controller.getContacts(request, response, next);

      const data: Contact[] = response._getData();

      expect(next).not.toBeCalled();
      expect(data).toEqual(contactsReadonlyMock);
    });

    it('should handle contacts with minimum fields', async () => {
      const controller: Controller = new Controller(
        {
          getContacts: () => Promise.resolve(contactsMinimumMock),
        },
        new ContactCacheStorage(new MemoryStorageAdapter()),
      );

      await controller.getContacts(request, response, next);

      const data: Contact[] = response._getData();

      expect(next).not.toBeCalled();
      expect(data).toEqual(contactsMinimumMock);
    });

    it('should handle invalid contacts with missing fields', async () => {
      console.error = jest.fn();

      const contactsBrokenMock = [...contactsWithMissingField] as Contact[];

      const controller: Controller = new Controller(
        {
          getContacts: () => Promise.resolve(contactsBrokenMock),
        },
        new ContactCacheStorage(new MemoryStorageAdapter()),
      );

      await controller.getContacts(request, response, next);

      expect(next).toBeCalled();
    });

    it('should handle an error when retrieving contacts', async () => {
      console.error = jest.fn();

      const controller: Controller = new Controller(
        {
          getContacts: () => Promise.reject(ERROR_MESSAGE),
        },
        new ContactCacheStorage(new MemoryStorageAdapter()),
      );

      await controller.getContacts(request, response, next);

      expect(next).toBeCalledWith(ERROR_MESSAGE);
    });
  });

  describe('getOAuth2RedirectUrl', () => {
    let request: MockRequest<BridgeRequest<unknown>>;
    let response: MockResponse<Response>;
    let next: jest.Mock;

    beforeEach(() => {
      request = createRequest();
      response = createResponse();
      next = jest.fn();
    });

    it('should handle OAuth2 callback', async () => {
      const mockHandleOAuth2Callback = jest.fn(async () =>
        Promise.resolve({
          apiKey: 'key',
          apiUrl: 'url',
        }),
      );

      const controller: Controller = new Controller(
        {
          handleOAuth2Callback: mockHandleOAuth2Callback,
        },
        new ContactCacheStorage(new MemoryStorageAdapter()),
      );

      await controller.oAuth2Callback(request, response);

      expect(mockHandleOAuth2Callback).toBeCalled();
      expect(next).not.toBeCalled();
    });

    it('should handle a custom redirect url', async () => {
      const mockRedirectUrl = 'http://example.com?name=TEST&key=key&url=url';
      const mockRedirect = jest.fn();
      const mockHandleOAuth2Callback = jest.fn(async (req: Request) =>
        Promise.resolve({
          apiKey: 'key',
          apiUrl: 'url',
        }),
      );

      const controller: Controller = new Controller(
        {
          handleOAuth2Callback: mockHandleOAuth2Callback,
        },
        new ContactCacheStorage(new MemoryStorageAdapter()),
      );

      request = createRequest({
        query: {
          redirectUrl: mockRedirectUrl,
        },
      });
      response = { redirect: mockRedirect } as any;
      await controller.oAuth2Callback(request, response);

      expect(mockHandleOAuth2Callback).toBeCalled();
      expect(mockRedirect).toBeCalledWith(mockRedirectUrl);
      expect(next).not.toBeCalled();
    });
  });

  describe('getHealth', () => {
    let request: MockRequest<BridgeRequest<unknown>>;
    let response: MockResponse<Response>;
    let next: jest.Mock;

    beforeEach(() => {
      request = createRequest();
      response = createResponse();
      next = jest.fn();
    });

    it('should implement a default function', async () => {
      const controller: Controller = new Controller(
        {
          getContacts: () => Promise.resolve(contactsMock),
        },
        new ContactCacheStorage(new MemoryStorageAdapter()),
      );

      await controller.getHealth(request, response, next);

      expect(next).not.toBeCalled();
      expect(response.statusCode).toBe(200);
    });

    it('should accept a custom function', async () => {
      const getHealthMock: () => Promise<void> = jest.fn();

      const controller: Controller = new Controller(
        {
          getContacts: () => Promise.resolve(contactsMock),
          getHealth: getHealthMock,
        },
        new ContactCacheStorage(new MemoryStorageAdapter()),
      );

      await controller.getHealth(request, response, next);

      expect(getHealthMock).toBeCalled();
      expect(next).not.toBeCalled();
      expect(response.statusCode).toBe(200);
    });

    it('should handle an error', async () => {
      console.error = jest.fn();

      const controller: Controller = new Controller(
        {
          getContacts: () => Promise.reject(),
          getHealth: () => Promise.reject(new Error('Error')),
        },
        new ContactCacheStorage(new MemoryStorageAdapter()),
      );

      await controller.getHealth(request, response, next);

      expect(next).toBeCalled();
    });
  });

  describe('handleCallEvent', () => {
    let request: MockRequest<BridgeRequest<CallEvent>>;
    let response: MockResponse<Response>;
    let next: jest.Mock;

    beforeEach(() => {
      response = createResponse();
      next = jest.fn();
    });

    it('should ignore a call event with a remote direct dial', async () => {
      request = createRequest({
        providerConfig: {
          apiKey: 'a1b2c3',
          apiUrl: 'http://example.com',
          locale: 'de_DE',
        },
        body: {
          participants: [
            {
              type: CallParticipantType.LOCAL,
              phoneNumber: '1234567890',
            },
            {
              type: CallParticipantType.REMOTE,
              phoneNumber: '13',
            },
          ],
          id: '',
          startTime: 0,
          endTime: 0,
          direction: CallDirection.IN,
          note: '',
          state: CallState.BUSY,
        },
      });
      const controller: Controller = new Controller(
        {
          handleCallEvent: (config, event) => Promise.resolve(''),
        },
        new ContactCacheStorage(new MemoryStorageAdapter()),
      );

      await controller.handleCallEvent(request, response, next);

      const data: string = response._getData();

      expect(next).not.toBeCalled();
      expect(data).toEqual('Skipping call event');
    });

    it('should handle a call event', async () => {
      request = createRequest({
        providerConfig: {
          apiKey: 'a1b2c3',
          apiUrl: 'http://example.com',
          locale: 'de_DE',
        },
        body: {
          participants: [
            {
              type: CallParticipantType.LOCAL,
              phoneNumber: '1234567890',
            },
            {
              type: CallParticipantType.REMOTE,
              phoneNumber: '0123456789',
            },
          ],
          id: '',
          startTime: 0,
          endTime: 0,
          direction: CallDirection.IN,
          note: '',
          state: CallState.BUSY,
        },
      });
      const controller: Controller = new Controller(
        {
          handleCallEvent: (config, event) => Promise.resolve('callRef'),
        },
        new ContactCacheStorage(new MemoryStorageAdapter()),
      );

      await controller.handleCallEvent(request, response, next);

      const data: string = response._getData();

      expect(next).not.toBeCalled();
      expect(data).toEqual('callRef');
    });

    it('should handle adapter not implementing the feature', async () => {
      request = createRequest({
        providerConfig: {
          apiKey: 'a1b2c3',
          apiUrl: 'http://example.com',
          locale: 'de_DE',
        },
      });
      const controller: Controller = new Controller(
        {},
        new ContactCacheStorage(new MemoryStorageAdapter()),
      );

      await controller.handleCallEvent(request, response, next);

      expect(next).toBeCalled();
    });

    it('should handle config being missing', async () => {
      request = createRequest({});
      const controller: Controller = new Controller(
        {
          handleCallEvent: (config, event) => Promise.resolve('callRef'),
        },
        new ContactCacheStorage(new MemoryStorageAdapter()),
      );

      await controller.handleCallEvent(request, response, next);

      expect(next).toBeCalled();
    });
  });

  describe('updateCallEvent', () => {
    let request: MockRequest<BridgeRequest<CallEvent>>;
    let response: MockResponse<Response>;
    let next: jest.Mock;

    beforeEach(() => {
      response = createResponse();
      next = jest.fn();
    });

    it('should handle a call event', async () => {
      request = createRequest({
        providerConfig: {
          apiKey: 'a1b2c3',
          apiUrl: 'http://example.com',
          locale: 'de_DE',
        },
        body: {
          participants: [
            {
              type: CallParticipantType.LOCAL,
              phoneNumber: '1234567890',
            },
            {
              type: CallParticipantType.REMOTE,
              phoneNumber: '0123456789',
            },
          ],
          id: '',
          startTime: 0,
          endTime: 0,
          direction: CallDirection.IN,
          note: '',
          state: CallState.BUSY,
        },
      });
      const controller: Controller = new Controller(
        {
          updateCallEvent: (config, id, event) => Promise.resolve(),
        },
        new ContactCacheStorage(new MemoryStorageAdapter()),
      );

      await controller.updateCallEvent(request, response, next);

      const data: string = response._getData();

      expect(next).not.toBeCalled();
      expect(data).toEqual('');
    });

    it('should handle adapter not implementing the feature', async () => {
      request = createRequest({
        providerConfig: {
          apiKey: 'a1b2c3',
          apiUrl: 'http://example.com',
          locale: 'de_DE',
        },
      });
      const controller: Controller = new Controller(
        {},
        new ContactCacheStorage(new MemoryStorageAdapter()),
      );

      await controller.updateCallEvent(request, response, next);

      expect(next).toBeCalled();
    });

    it('should handle config being missing', async () => {
      request = createRequest({});
      const controller: Controller = new Controller(
        {
          updateCallEvent: (config, id, event) => Promise.resolve(),
        },
        new ContactCacheStorage(new MemoryStorageAdapter()),
      );

      await controller.updateCallEvent(request, response, next);

      expect(next).toBeCalled();
    });
  });
});
