import { NextFunction, Request, Response } from 'express';
import { isEqual, uniqWith } from 'lodash';
import { stringify } from 'querystring';
import {
  Adapter,
  CallEvent,
  Config,
  Contact,
  ContactCache,
  ContactTemplate,
  ContactUpdate,
  IntegrationEntityType,
  IntegrationsEvent,
  PubSubClient,
  PubSubIntegrationsEventMessage,
  ServerError,
} from '.';
import {
  contactCreateSchema,
  contactSchema,
  contactsGetSchema,
} from '../schemas';
import { shouldSkipCallEvent } from '../util/call-event.util';
import { errorLogger, infoLogger } from '../util/logger.util';
import {
  BridgeRequest,
  IdBridgeRequest,
  IntegrationEntityBridgeRequest,
} from './bridge-request.model';
import { CacheItemStateType } from './cache-item-state.model';
import { IntegrationErrorType } from './integration-error.model';

import { sanitizeContact } from '../util/contact.util';
import {
  PubSubContactsMessage,
  PubSubContactsState,
} from './pubsub/pubsub-contacts-message.model';
import { anonymizeKey } from '../util/anonymize-key';

const CONTACT_FETCH_TIMEOUT = 5000;

export class Controller {
  private adapter: Adapter;
  private contactCache: ContactCache | null;
  private pubSubContactStreamingClient: PubSubClient<PubSubContactsMessage> | null =
    null;
  private pubSubIntegrationEventsClient: PubSubClient<PubSubIntegrationsEventMessage> | null =
    null;
  private additionalPubSubContactStreamingClient: PubSubClient<PubSubContactsMessage> | null =
    null;
  private integrationName: string = 'UNKNOWN';

  // used for garbage collection reasons, to prevent long running promises from getting canceled
  private streamingPromises = new Map<string, Promise<void>>();

  constructor(adapter: Adapter, contactCache: ContactCache | null) {
    this.adapter = adapter;
    this.contactCache = contactCache;

    if (this.adapter.streamContacts) {
      this.initContactStreaming();
    }

    if (this.adapter.handleWebhook) {
      this.initContactChanges();
    }

    if (this.adapter.streamContacts || this.adapter.handleWebhook) {
      const { INTEGRATION_NAME: integrationName } = process.env;

      if (!integrationName) {
        throw new Error('No INTEGRATION_NAME provided.');
      }

      this.integrationName = integrationName;
    }
  }

  private initContactStreaming() {
    const {
      PUBSUB_TOPIC_NAME: topicNameLegacy,
      PUBSUB_TOPIC_NAME_CONTACT_STREAMING: topicName,
      PUBSUB_ADDITIONAL_TOPIC_NAME: additionalTopicName,
    } = process.env;

    const topicNameProvided = topicName ?? topicNameLegacy;

    if (!topicNameProvided) {
      throw new Error('No PUBSUB_TOPIC_NAME_CONTACT_STREAMING provided.');
    }

    this.pubSubContactStreamingClient = new PubSubClient(topicNameProvided);
    infoLogger(
      'Controller',
      `Initialized PubSub client for topic ${topicNameProvided}`,
    );
    if (additionalTopicName) {
      this.additionalPubSubContactStreamingClient = new PubSubClient(
        additionalTopicName,
      );
      infoLogger(
        'Controller',
        `Initialized PubSub client for topic ${additionalTopicName}`,
      );
    }
  }

  private initContactChanges() {
    const { PUBSUB_TOPIC_NAME_INTEGRATION_EVENTS: topicName } = process.env;

    if (!topicName) {
      throw new Error('No PUBSUB_TOPIC_NAME_INTEGRATION_EVENTS provided.');
    }

    this.pubSubIntegrationEventsClient = new PubSubClient(topicName);
    infoLogger(
      'Controller',
      `Initialized PubSub client for topic ${topicName}`,
    );
  }

  public async isValidToken(
    req: BridgeRequest<unknown>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const { providerConfig } = req;

    if (!providerConfig) {
      throw new ServerError(400, 'Missing parameters');
    }

    try {
      infoLogger('isValidToken', 'START', providerConfig.apiKey);

      if (!this.adapter.isValidToken) {
        throw new ServerError(
          501,
          'Token validation function is not implemented',
        );
      }

      const isTokenValid = await this.adapter.isValidToken(providerConfig);

      if (!isTokenValid) {
        throw new ServerError(401, 'Token is not valid');
      }

      infoLogger('isValidToken', 'END', providerConfig.apiKey);

      res.status(200).send('OK');
    } catch (error: any) {
      // prevent logging of refresh errors
      if (
        error instanceof ServerError &&
        error.message === IntegrationErrorType.INTEGRATION_REFRESH_ERROR
      ) {
        next(error);
        return;
      }

      errorLogger(
        'isValidToken',
        'Could not validate token:',
        providerConfig.apiKey,
        error,
      );
      next(error);
    }
  }

  public async getContacts(
    req: BridgeRequest<unknown>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const { providerConfig } = req;

    if (!providerConfig) {
      throw new ServerError(400, 'Missing parameters');
    }

    try {
      infoLogger('getContacts', 'START', providerConfig.apiKey);

      const fetchContacts = async (): Promise<Contact[]> => {
        if (!this.adapter.getContacts) {
          throw new ServerError(501, 'Fetching contacts is not implemented');
        }

        infoLogger('getContacts', `Fetching contacts…`, providerConfig.apiKey);

        const fetchedContacts: Contact[] = await this.adapter.getContacts(
          providerConfig,
        );

        const { error: parsingError, data: parsedContacts } =
          contactsGetSchema.safeParse(fetchedContacts);

        if (parsingError)
          throw new ServerError(
            500,
            `Invalid contacts received: ${parsingError.message}`,
          );

        return parsedContacts.map((contact) =>
          sanitizeContact(contact, providerConfig.locale),
        );
      };

      const fetcherPromise = this.contactCache
        ? this.contactCache.get(providerConfig.apiKey, fetchContacts)
        : fetchContacts();

      const timeoutPromise: Promise<'TIMEOUT'> = new Promise((resolve) =>
        setTimeout(() => resolve('TIMEOUT'), CONTACT_FETCH_TIMEOUT),
      );

      const raceResult = await Promise.race([fetcherPromise, timeoutPromise]);
      if (raceResult === 'TIMEOUT') {
        infoLogger(
          'getContacts',
          `Fetching too slow, returning empty array.`,
          providerConfig.apiKey,
        );
      }

      const responseContacts: Contact[] = Array.isArray(raceResult)
        ? raceResult
        : [];

      const contactsCount = responseContacts.length;

      infoLogger(
        'getContacts',
        `Found ${contactsCount} cached contacts`,
        providerConfig.apiKey,
      );

      if (
        !Array.isArray(raceResult) &&
        (raceResult === 'TIMEOUT' ||
          raceResult.state === CacheItemStateType.FETCHING)
      ) {
        res.header('X-Fetching-State', 'pending');
      }

      if (this.adapter.getToken && req.providerConfig) {
        try {
          const { apiKey } = await this.adapter.getToken(req.providerConfig);
          res.header('X-Provider-Key', apiKey);
        } catch (error) {
          errorLogger(
            'getContacts',
            'Could not get and refresh token',
            providerConfig.apiKey,
            error,
          );
        }
      }

      infoLogger('getContacts', 'END', providerConfig.apiKey);
      res.status(200).send(responseContacts);
    } catch (error: any) {
      // prevent logging of refresh errors
      if (
        error instanceof ServerError &&
        error.message === IntegrationErrorType.INTEGRATION_REFRESH_ERROR
      ) {
        next(error);
        return;
      }

      errorLogger(
        'getContacts',
        'Could not get contacts:',
        providerConfig.apiKey,
        error,
      );
      next(error);
    }
  }

  public async streamContacts(
    req: BridgeRequest<unknown>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const { providerConfig } = req;
    try {
      if (!providerConfig) {
        throw new ServerError(400, 'Missing parameters');
      }

      const { userId } = providerConfig;

      if (!userId) {
        throw new ServerError(400, 'Missing user ID');
      }

      const timestamp = Date.now();
      const orderingKey = `${userId}:${timestamp}`;

      infoLogger(
        'streamContacts',
        `[${orderingKey}] Starting contact streaming`,
        providerConfig.apiKey,
      );

      const publishContacts = async (contacts: Contact[]) => {
        try {
          const { error: parsingError, data: parsedContacts } =
            contactsGetSchema.safeParse(contacts);

          if (parsingError) {
            throw new ServerError(
              500,
              `Invalid contacts received: ${parsingError.message}`,
            );
          }

          await this.pubSubContactStreamingClient?.publishMessage(
            {
              userId,
              timestamp,
              contacts: parsedContacts.map((contact) =>
                sanitizeContact(contact, providerConfig.locale),
              ),
              state: PubSubContactsState.IN_PROGRESS,
              integrationName: this.integrationName,
            },
            orderingKey,
          );

          // todo: remove as soon as platypus goes live
          await this.additionalPubSubContactStreamingClient?.publishMessage(
            {
              userId,
              timestamp,
              contacts: contacts.map((contact) =>
                sanitizeContact(contact, providerConfig.locale),
              ),
              state: PubSubContactsState.IN_PROGRESS,
              integrationName: this.integrationName,
            },
            orderingKey,
          );
        } catch (error) {
          if (error instanceof ServerError) {
            errorLogger(
              'streamContacts',
              `[${orderingKey}] Could not publish contacts`,
              providerConfig.apiKey,
              { message: error.message, status: error.status },
            );
            return;
          }

          errorLogger(
            'streamContacts',
            `[${orderingKey}] Could not publish contacts (${error})`,
            providerConfig.apiKey,
          );
        }
      };

      const streamContacts = async () => {
        if (!this.adapter.streamContacts) {
          throw new ServerError(501, 'Streaming contacts is not implemented');
        }

        const iterator = this.adapter.streamContacts(providerConfig);

        let result;
        do {
          result = await iterator.next();

          const { value: contacts } = result;

          if (contacts && contacts.length > 0) await publishContacts(contacts);
        } while (!result.done);
      };

      const streamingPromise = streamContacts()
        .then(() => {
          this.additionalPubSubContactStreamingClient?.publishMessage(
            {
              userId: providerConfig.userId,
              timestamp,
              contacts: [],
              state: PubSubContactsState.COMPLETE,
              integrationName: this.integrationName,
            },
            orderingKey,
          );

          return this.pubSubContactStreamingClient?.publishMessage(
            {
              userId: providerConfig.userId,
              timestamp,
              contacts: [],
              state: PubSubContactsState.COMPLETE,
              integrationName: this.integrationName,
            },
            orderingKey,
          );
        })
        .catch(async (error) => {
          errorLogger(
            'streamContacts',
            `[${orderingKey}] Could not stream contacts`,
            providerConfig.apiKey,
            error,
          );
          this.additionalPubSubContactStreamingClient?.publishMessage(
            {
              userId: providerConfig.userId,
              timestamp,
              contacts: [],
              state: PubSubContactsState.FAILED,
              integrationName: this.integrationName,
            },
            orderingKey,
          );

          return this.pubSubContactStreamingClient?.publishMessage(
            {
              userId: providerConfig.userId,
              timestamp,
              contacts: [],
              state: PubSubContactsState.FAILED,
              integrationName: this.integrationName,
            },
            orderingKey,
          );
        })
        .catch((error) => {
          errorLogger(
            'streamContacts',
            `[${orderingKey}] Could not publish failed message`,
            providerConfig.apiKey,
            error,
          );
        })
        .finally(() => this.streamingPromises.delete(`${userId}:${timestamp}`));

      this.streamingPromises.set(`${userId}:${timestamp}`, streamingPromise);

      if (this.adapter.getToken && req.providerConfig) {
        try {
          const { apiKey } = await this.adapter.getToken(req.providerConfig);
          res.header('X-Provider-Key', apiKey);
        } catch (error) {
          errorLogger(
            'streamContacts',
            `[${orderingKey}] Could not get and refresh token`,
            providerConfig.apiKey,
            error,
          );
        }
      }

      infoLogger(
        `streamContacts`,
        `[${orderingKey}] END`,
        providerConfig.apiKey,
      );

      res.status(200).send({ timestamp });

      await streamingPromise;
    } catch (error: any) {
      // prevent logging of refresh errors
      if (
        error instanceof ServerError &&
        error.message === IntegrationErrorType.INTEGRATION_REFRESH_ERROR
      ) {
        next(error);
        return;
      }

      errorLogger(
        'streamContacts',
        `Could not stream contacts`,
        providerConfig?.apiKey,
        error,
      );
      next(error);
    }
  }

  public async getContact(
    req: BridgeRequest<unknown>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const { providerConfig } = req;
    try {
      if (!providerConfig) {
        throw new ServerError(400, 'Missing parameters');
      }

      if (!this.adapter.getContact) {
        throw new ServerError(501, 'Getting single contact is not implemented');
      }

      infoLogger('getContact', 'START', providerConfig.apiKey);

      const contactType: IntegrationEntityType | undefined = Object.values(
        IntegrationEntityType,
      ).find((value) => value === req.query.type?.toString());

      if (!contactType) {
        throw new ServerError(400, 'Missing contact type query parameter');
      }

      const contactId = req.params.id;
      infoLogger(
        'getContact',
        `Fetching contact ${contactId} of type ${contactType}`,
        providerConfig.apiKey,
      );

      const contact = await this.adapter.getContact(
        providerConfig,
        contactId,
        contactType,
      );

      infoLogger('getContact', 'END', providerConfig.apiKey);
      res.status(200).send(sanitizeContact(contact, providerConfig.locale));
    } catch (error: any) {
      // prevent logging of refresh errors
      if (
        error instanceof ServerError &&
        error.message === IntegrationErrorType.INTEGRATION_REFRESH_ERROR
      ) {
        next(error);
        return;
      }

      errorLogger(
        'getContact',
        'Could not get contact:',
        providerConfig?.apiKey,
        error,
      );
      next(error);
    }
  }

  public async createContact(
    req: BridgeRequest<ContactTemplate>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const { providerConfig: { apiKey = '', locale = '' } = {} } = req;
    try {
      infoLogger('createContact', 'START', apiKey);

      if (!this.adapter.createContact) {
        throw new ServerError(501, 'Creating contacts is not implemented');
      }

      if (!req.providerConfig) {
        throw new ServerError(400, 'Missing config parameters');
      }

      const parseResultContactCreate = contactCreateSchema.safeParse(req.body);

      if (parseResultContactCreate.error)
        throw new ServerError(
          400,
          `Invalid contactCreate received: ${parseResultContactCreate.error.message}`,
        );

      infoLogger('createContact', 'Creating contact', apiKey);

      const contact: Contact = await this.adapter.createContact(
        req.providerConfig,
        parseResultContactCreate.data,
      );

      const parseResultReturnContact = contactSchema.safeParse(contact);

      if (parseResultReturnContact.error)
        throw new ServerError(
          500,
          `Invalid contact returned from bridge: ${parseResultReturnContact.error.message}`,
        );

      infoLogger(
        'createContact',
        `Contact with id ${parseResultReturnContact.data.id} created`,
        apiKey,
      );

      const sanitizedContact: Contact = sanitizeContact(
        parseResultReturnContact.data,
        locale,
      );

      if (this.adapter.getToken && req.providerConfig) {
        const { apiKey } = await this.adapter.getToken(req.providerConfig);
        res.header('X-Provider-Key', apiKey);
      }
      res.status(200).send(sanitizedContact);

      if (this.contactCache) {
        const contacts = await this.contactCache.get(apiKey);
        if (Array.isArray(contacts)) {
          await this.contactCache.set(apiKey, [...contacts, sanitizedContact]);
        }
      }

      infoLogger('createContact', 'END', apiKey);
    } catch (error) {
      // prevent logging of refresh errors
      if (
        error instanceof ServerError &&
        error.message === IntegrationErrorType.INTEGRATION_REFRESH_ERROR
      ) {
        next(error);
        return;
      }

      errorLogger(
        'createContact',
        'Could not create contact:',
        apiKey,
        error || 'Unknown',
      );
      errorLogger('createContact', 'Entity', apiKey, req.body);
      next(error);
    }
  }

  public async updateContact(
    req: IdBridgeRequest<ContactUpdate>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const { providerConfig: { apiKey = '', locale = '' } = {} } = req;
    try {
      if (!this.adapter.updateContact) {
        throw new ServerError(501, 'Updating contacts is not implemented');
      }

      if (!req.providerConfig) {
        throw new ServerError(400, 'Missing config parameters');
      }

      const parseResultContactUpdate = contactCreateSchema.safeParse(req.body);

      if (parseResultContactUpdate.error)
        throw new ServerError(
          400,
          `Invalid contactUpdate received: ${parseResultContactUpdate.error.message}`,
        );

      infoLogger('updateContact', 'Updating contact', apiKey);

      const contact: Contact = await this.adapter.updateContact(
        req.providerConfig,
        req.params.id,
        { ...parseResultContactUpdate.data, id: req.params.id }, // todo: remove id from contactUpdate type
      );

      const parseResultReturnContact = contactSchema.safeParse(contact);

      if (parseResultReturnContact.error)
        throw new ServerError(
          500,
          `Invalid contact returned from bridge: ${parseResultReturnContact.error.message}`,
        );

      infoLogger(
        'updateContact',
        `Contact with id ${parseResultReturnContact.data.id} updated`,
        apiKey,
      );

      const sanitizedContact: Contact = sanitizeContact(
        parseResultReturnContact.data,
        locale,
      );

      if (this.adapter.getToken && req.providerConfig) {
        const { apiKey } = await this.adapter.getToken(req.providerConfig);
        res.header('X-Provider-Key', apiKey);
      }
      res.status(200).send(sanitizedContact);

      if (this.contactCache) {
        const contacts = await this.contactCache.get(apiKey);
        if (Array.isArray(contacts)) {
          const updatedCache: Contact[] = contacts.map((entry) =>
            entry.id === sanitizedContact.id ? sanitizedContact : entry,
          );
          await this.contactCache.set(apiKey, updatedCache);
        }
      }

      infoLogger('updateContact', 'END', apiKey);
    } catch (error) {
      // prevent logging of refresh errors
      if (
        error instanceof ServerError &&
        error.message === IntegrationErrorType.INTEGRATION_REFRESH_ERROR
      ) {
        next(error);
        return;
      }

      errorLogger(
        'updateContact',
        'Could not update contact:',
        apiKey,
        error || 'Unknown',
      );
      errorLogger('updateContact', 'Entity', apiKey, req.body);
      next(error);
    }
  }

  public async deleteContact(
    req: IdBridgeRequest<unknown>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const { providerConfig: { apiKey = '' } = {} } = req;
    try {
      infoLogger('deleteContact', 'START', apiKey);

      if (!this.adapter.deleteContact) {
        throw new ServerError(501, 'Deleting contacts is not implemented');
      }

      if (!req.providerConfig) {
        throw new ServerError(400, 'Missing config parameters');
      }

      infoLogger('deleteContact', 'Deleting contact', apiKey);

      const contactId = req.params.id;
      await this.adapter.deleteContact(req.providerConfig, contactId);

      if (this.adapter.getToken && req.providerConfig) {
        const { apiKey } = await this.adapter.getToken(req.providerConfig);
        res.header('X-Provider-Key', apiKey);
      }
      res.status(200).send();

      infoLogger(
        'deleteContact',
        `Contact with id ${contactId} deleted`,
        apiKey,
      );

      if (this.contactCache) {
        const contacts = await this.contactCache.get(apiKey);
        if (Array.isArray(contacts)) {
          const updatedCache: Contact[] = contacts.filter(
            (entry) => entry.id !== contactId,
          );
          await this.contactCache.set(apiKey, updatedCache);
        }
      }

      infoLogger('deleteContact', 'END', apiKey);
    } catch (error) {
      // prevent logging of refresh errors
      if (
        error instanceof ServerError &&
        error.message === IntegrationErrorType.INTEGRATION_REFRESH_ERROR
      ) {
        next(error);
        return;
      }

      errorLogger(
        'deleteContact',
        'Could not delete contact:',
        apiKey,
        error || 'Unknown',
      );
      next(error);
    }
  }

  /**
   * @deprecated Use createOrUpdateCallLogForEntities instead
   * @param req
   * @param res
   * @param next
   */
  public async handleCallEvent(
    req: BridgeRequest<CallEvent>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const { providerConfig } = req;

    try {
      infoLogger('handleCallEvent', `START`, providerConfig?.apiKey);
      if (!providerConfig) {
        throw new ServerError(400, 'Missing config parameters');
      }

      if (!this.adapter.handleCallEvent) {
        throw new ServerError(501, 'Handling call event is not implemented');
      }

      if (shouldSkipCallEvent(req.body)) {
        infoLogger(
          'handleCallEvent',
          `Skipping call event for call id ${req.body.id}`,
          providerConfig.apiKey,
        );
        res.status(200).send('Skipping call event');
        return;
      }

      infoLogger(
        'handleCallEvent',
        `Handling call event`,
        providerConfig.apiKey,
      );

      const integrationCallEventRef = await this.adapter.handleCallEvent(
        providerConfig,
        req.body,
      );

      if (integrationCallEventRef != '')
        infoLogger(
          'handleCallEvent',
          `CallEvent with refId ${integrationCallEventRef} created!`,
          providerConfig.apiKey,
        );
      else
        infoLogger(
          'handleCallEvent',
          `Did not create callEvent`,
          providerConfig.apiKey,
        );

      infoLogger('handleCallEvent', `END`, providerConfig.apiKey);
      res.status(200).send(integrationCallEventRef);
    } catch (error) {
      errorLogger(
        'handleCallEvent',
        'Could not handle call event:',
        providerConfig?.apiKey,
        [error || 'Unknown', req.body],
      );
      next(error);
    }
  }

  public async handleConnectedEvent(
    req: BridgeRequest<unknown>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const { providerConfig: { apiKey = '' } = {} } = req;
    try {
      infoLogger('handleConnectedEvent', `START`, apiKey);

      if (!this.adapter.handleConnectedEvent) {
        throw new ServerError(
          501,
          'Handling connected event is not implemented',
        );
      }

      if (!req.providerConfig) {
        throw new ServerError(400, 'Missing config parameters');
      }
      infoLogger('handleConnectedEvent', `Handling connected event`, apiKey);

      await this.adapter.handleConnectedEvent(req.providerConfig);

      infoLogger('handleConnectedEvent', `END`, apiKey);
      res.status(200).send();
    } catch (error) {
      errorLogger(
        'handleConnectedEvent',
        `Could not handle connected event:`,
        apiKey,
        error || 'Unknown',
      );
      errorLogger('handleConnectedEvent', 'Entity', apiKey, req.body);
      next(error);
    }
  }

  public async handleDisconnectedEvent(
    req: BridgeRequest<unknown>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const { providerConfig: { apiKey = '' } = {} } = req;
    try {
      infoLogger('handleDisconnectedEvent', `START`, apiKey);

      if (!this.adapter.handleDisconnectedEvent) {
        throw new ServerError(
          501,
          'Handling disconnected event is not implemented',
        );
      }

      if (!req.providerConfig) {
        throw new ServerError(400, 'Missing config parameters');
      }
      infoLogger(
        'handleDisconnectedEvent',
        `Handling disconnected event`,
        apiKey,
      );

      await this.adapter.handleDisconnectedEvent(req.providerConfig);

      infoLogger('handleDisconnectedEvent', `END`, apiKey);
      res.status(200).send();
    } catch (error) {
      errorLogger(
        'handleDisconnectedEvent',
        `Could not handle connected event:`,
        apiKey,
        error || 'Unknown',
      );
      errorLogger('handleDisconnectedEvent', 'Entity', apiKey, req.body);
      next(error);
    }
  }

  /**
   * @deprecated Use createOrUpdateCallLogForEntities instead
   * @param req
   * @param res
   * @param next
   */
  public async updateCallEvent(
    req: BridgeRequest<CallEvent>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const { providerConfig: { apiKey = '' } = {}, body, params } = req;

    try {
      infoLogger('updateCallEvent', `START`, apiKey);
      if (!this.adapter.updateCallEvent) {
        throw new ServerError(501, 'Updating call events is not implemented');
      }

      if (!req.providerConfig) {
        throw new ServerError(400, 'Missing config parameters');
      }
      infoLogger('updateCallEvent', `Updating call event`, apiKey);

      await this.adapter.updateCallEvent(req.providerConfig, params.id, body);
      infoLogger('updateCallEvent', `END`, apiKey);
      res.status(200).send();
    } catch (error) {
      errorLogger(
        'updateCallEvent',
        `Could not update call event:`,
        apiKey,
        error || 'Unknown',
      );
      errorLogger('updateCallEvent', 'Entity', apiKey, req.body);
      next(error);
    }
  }

  public async getEntity(
    req: IntegrationEntityBridgeRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const { providerConfig } = req;
    try {
      infoLogger('getEntity', `START`, providerConfig?.apiKey);

      if (!providerConfig) {
        throw new ServerError(400, 'Missing parameters');
      }

      if (!this.adapter.getEntity) {
        throw new ServerError(501, 'Fetching Entity is not implemented');
      }

      const fetchedEntity = await this.adapter.getEntity(
        providerConfig,
        req.params.id,
        req.params.type,
      );

      infoLogger(
        'getEntity',
        `successfully got entity`,
        providerConfig.apiKey,
        {
          ...fetchedEntity,
          label: anonymizeKey(fetchedEntity?.label),
        },
      );

      infoLogger('getEntity', `END`, providerConfig.apiKey);

      res.status(200).send(fetchedEntity);
    } catch (error) {
      errorLogger(
        'getEntity',
        'Could not get entity:',
        providerConfig?.apiKey,
        error,
      );
      next(error);
    }
  }

  public async getEntitiesForContact(
    req: {
      providerConfig?: Config;
      params: { id: string };
    },
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const { providerConfig } = req;
    try {
      infoLogger('getEntitiesForContact', `START`, providerConfig?.apiKey);

      if (!providerConfig) {
        throw new ServerError(400, 'Missing parameters');
      }

      if (!this.adapter.getEntitiesForContact) {
        throw new ServerError(
          501,
          'Fetching Entities for contact is not implemented',
        );
      }

      const fetchedEntities = await this.adapter.getEntitiesForContact(
        providerConfig,
        req.params.id,
      );

      infoLogger(
        'getEntitiesForContact',
        `successfully fetched ${fetchedEntities.length} entities`,
        providerConfig.apiKey,
        {
          count: fetchedEntities.length,
        },
      );
      infoLogger('getEntitiesForContact', `END`, providerConfig?.apiKey);
      res.status(200).send(fetchedEntities);
    } catch (error) {
      errorLogger(
        'getEntitiesForContact',
        'Could not get entities for contact',
        providerConfig?.apiKey,
        error,
      );
      next(error);
    }
  }

  public async getHealth(
    req: BridgeRequest<unknown>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (this.adapter.getHealth) {
        await this.adapter.getHealth();
      }
      res.sendStatus(200);
    } catch (error) {
      errorLogger('getHealth', 'Health check failed:', '', error || 'Unknown');
      next(error || 'Internal Server Error');
    }
  }

  public async oAuth2Redirect(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!this.adapter.getOAuth2RedirectUrl) {
        throw new ServerError(501, 'OAuth2 flow not implemented');
      }

      const redirectUrl = await this.adapter.getOAuth2RedirectUrl(req, res);

      res.status(200).send({ redirectUrl });
    } catch (error) {
      errorLogger(
        'oAuth2Redirect',
        'Could not get OAuth2 redirect URL:',
        '',
        error || 'Unknown',
      );
      next(error);
    }
  }

  public async oAuth2Callback(req: Request, res: Response): Promise<void> {
    const {
      OAUTH2_REDIRECT_URL: redirectUrl,
      OAUTH2_IDENTIFIER: oAuth2Identifier = 'UNKNOWN',
    } = process.env;

    if (!redirectUrl) {
      errorLogger('oAuth2Callback', 'OAuth2 Redirect URL not configured!', '');
      res.status(500).send('OAuth2 Redirect URL not configured!');
      return;
    }

    try {
      if (!this.adapter.handleOAuth2Callback) {
        throw new ServerError(501, 'OAuth2 flow not implemented');
      }

      const { apiKey, apiUrl } = await this.adapter.handleOAuth2Callback(
        req,
        res,
      );

      const params = stringify({
        name: oAuth2Identifier,
        key: apiKey,
        url: apiUrl,
      });

      res.redirect(`${redirectUrl}?${params}`);
    } catch (error) {
      errorLogger(
        'oAuth2Callback',
        'Unable to save OAuth2 token:',
        '',
        error || 'Unknown',
      );
      res.redirect(redirectUrl);
    }
  }

  public async oAuth2Token(req: Request, res: Response): Promise<void> {
    try {
      if (!this.adapter.handleOAuth2Callback) {
        throw new ServerError(501, 'OAuth2 flow not implemented');
      }

      const credentials = await this.adapter.handleOAuth2Callback(req, res);

      res.json(credentials);
    } catch (error) {
      errorLogger(
        'oAuth2Callback',
        'Unable to save OAuth2 token:',
        '',
        error || 'Unknown',
      );

      throw error;
    }
  }

  public async getAccountId(
    req: BridgeRequest<unknown>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const { providerConfig } = req;

    try {
      if (!providerConfig) {
        throw new ServerError(400, 'Missing parameters');
      }

      if (!this.adapter.getAccountId) {
        throw new ServerError(501, 'Fetching account id is not implemented');
      }

      infoLogger('getAccountId', 'START', providerConfig.apiKey);

      const accountId = await this.adapter.getAccountId(providerConfig);

      if (!accountId) {
        throw new ServerError(500, 'AccountID not found');
      }

      infoLogger('getAccountId', 'END', providerConfig.apiKey);
      res.status(200).json(accountId.toString());
    } catch (error: any) {
      errorLogger(
        'getAccountId',
        'Could not get AccountId',
        providerConfig?.apiKey,
        error,
      );
      next(error);
    }
  }

  public async handleWebhook(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!this.adapter.handleWebhook) {
        throw new ServerError(501, 'Webhook handling not implemented');
      }

      if (!this.adapter.verifyWebhookRequest) {
        throw new ServerError(501, 'Webhook verification not implemented');
      }

      const verified = await this.adapter.verifyWebhookRequest(req);

      if (!verified) {
        errorLogger('handleWebhook', 'Webhook verification failed');
        throw new ServerError(403, 'Webhook verification failed');
      }

      infoLogger('handleWebhook', 'START');

      const events: IntegrationsEvent[] = await this.adapter.handleWebhook(req);

      infoLogger('handleWebhook', `Got ${events.length} events`);

      const deduplicatedEvents = uniqWith(events, isEqual);

      const publishResults = await Promise.allSettled(
        deduplicatedEvents
          .map<PubSubIntegrationsEventMessage>((event: IntegrationsEvent) => ({
            integrationName: this.integrationName,
            ...event,
          }))
          .map((message) => {
            infoLogger(
              'handleWebhook',
              `Publishing event ${message.type} with accountId ${message.accountId}`,
            );
            return this.pubSubIntegrationEventsClient?.publishMessage(message);
          }),
      );

      publishResults.forEach((result) => {
        if (result.status === 'rejected') {
          errorLogger(
            'handleWebhook',
            `Could not publish event ${result.reason.type} with accountId ${result.reason.accountId}`,
            '',
            result.reason,
          );
        }
      });

      infoLogger('handleWebhook', 'END', '');
      res.sendStatus(200);
    } catch (error) {
      errorLogger(
        'handleWebhook',
        'Could not handle webhook:',
        '',
        error || 'Unknown',
      );
      next(error);
    }
  }
}
