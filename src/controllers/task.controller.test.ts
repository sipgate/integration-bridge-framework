import { Response } from 'express';
import { BridgeRequest, FollowUpWithIntegrationEntities } from '../models';
import { TaskController } from './task.controller';

describe('Task Controller', () => {
  const mockAdapter = {
    getTasks: jest.fn(),
    findAllByQuery: jest.fn(),
    createFollowUp: jest.fn(),
  };
  const mockNext = jest.fn();

  describe('findAllByQuery', () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should check for providerConfig', async () => {
      const controller = new TaskController(mockAdapter);

      const result = await controller.findAllByQuery(
        {} as BridgeRequest<void>,
        {} as Response,
        mockNext,
      );

      expect(result).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('Should check if adapter.getTasks is implemented', async () => {
      const controller = new TaskController({});

      const result = await controller.findAllByQuery(
        {} as BridgeRequest<void>,
        {} as Response,
        mockNext,
      );

      expect(result).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('Should handle erroneous adapter.getTasks call', async () => {
      const controller = new TaskController(mockAdapter);

      mockAdapter.getTasks.mockRejectedValue(null);

      const result = await controller.findAllByQuery(
        {
          providerConfig: {
            userId: '123',
            apiKey: '123123123',
            apiUrl: ':)',
            locale: 'de-DE',
          },
        } as BridgeRequest<void>,
        {} as Response,
        mockNext,
      );

      expect(result).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('Should resolve happy path', async () => {
      const controller = new TaskController(mockAdapter);
      const mockResponse = { json: jest.fn() };

      mockAdapter.getTasks.mockResolvedValue([]);

      const req = {
        providerConfig: {
          userId: '123',
          apiKey: '123123123',
          apiUrl: ':)',
          locale: 'de-DE',
        },
      } as BridgeRequest<void>;

      const result = await controller.findAllByQuery(
        req,
        mockResponse as unknown as Response,
        mockNext,
      );

      expect(result).toBeUndefined();
      expect(mockAdapter.getTasks).toHaveBeenCalledWith(
        req,
        req.providerConfig,
      );
      expect(mockResponse.json).toHaveBeenCalledWith([]);
    });
  });

  describe('create', () => {
    it('Should check for providerConfig', async () => {
      const controller = new TaskController(mockAdapter);

      const result = await controller.create(
        {} as BridgeRequest<FollowUpWithIntegrationEntities>,
        {} as Response,
        mockNext,
      );

      expect(result).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('Should check if adapter.createFollowUp is implemented', async () => {
      const controller = new TaskController({});

      const result = await controller.create(
        {} as BridgeRequest<FollowUpWithIntegrationEntities>,
        {} as Response,
        mockNext,
      );

      expect(result).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('Should handle erroneous adapter.createFollowUp call', async () => {
      const controller = new TaskController(mockAdapter);

      mockAdapter.createFollowUp.mockRejectedValue(null);

      const result = await controller.create(
        {
          providerConfig: {
            userId: '123',
            apiKey: '123123123',
            apiUrl: ':)',
            locale: 'de-DE',
          },
        } as BridgeRequest<FollowUpWithIntegrationEntities>,
        {} as Response,
        mockNext,
      );

      expect(result).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('Should resolve happy path', async () => {
      const controller = new TaskController(mockAdapter);
      const mockResponse = { json: jest.fn() };

      const followUpId = 123;

      mockAdapter.createFollowUp.mockResolvedValue(followUpId);

      const req = {
        providerConfig: {
          userId: '123',
          apiKey: '123123123',
          apiUrl: ':)',
          locale: 'de-DE',
        },
      } as BridgeRequest<FollowUpWithIntegrationEntities>;

      const result = await controller.create(
        req,
        mockResponse as unknown as Response,
        mockNext,
      );

      expect(result).toBeUndefined();
      expect(mockAdapter.createFollowUp).toHaveBeenCalledWith(
        req.providerConfig,
        undefined,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({ followUpId });
    });
  });
});
