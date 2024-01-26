import { Response } from 'express';
import {
  BridgeRequest,
  FollowUpWithIntegrationEntities,
  IdBridgeRequest,
  Task,
} from '../models';
import { TaskController } from './task.controller';

describe('Task Controller', () => {
  const mockAdapter = {
    getTask: jest.fn(),
    findById: jest.fn(),
    createFollowUp: jest.fn(),
  };
  const mockNext = jest.fn();

  describe('findById', () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should check for providerConfig', async () => {
      const controller = new TaskController(mockAdapter);

      const result = await controller.findById(
        { params: { id: '123' } } as IdBridgeRequest<Task>,
        {} as Response,
        mockNext,
      );

      expect(result).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('Should check if adapter.getTask is implemented', async () => {
      const controller = new TaskController({});

      const result = await controller.findById(
        { params: { id: '123' } } as IdBridgeRequest<Task>,
        {} as Response,
        mockNext,
      );

      expect(result).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('Should handle erroneous adapter.getTask call', async () => {
      const controller = new TaskController(mockAdapter);

      mockAdapter.getTask.mockRejectedValue(null);

      const result = await controller.findById(
        {
          providerConfig: {
            userId: '123',
            apiKey: '123123123',
            apiUrl: ':)',
            locale: 'de-DE',
          },
          params: { id: '123' },
        } as IdBridgeRequest<Task>,
        {} as Response,
        mockNext,
      );

      expect(result).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('Should resolve happy path', async () => {
      const controller = new TaskController(mockAdapter);
      const mockResponse = { json: jest.fn() };

      const mockTask: Task = {
        id: '123',
        content: 'string',
        createdAt: 12345678,
        dueAt: 12345678,
        title: 'string',
        type: 'string',
      };
      mockAdapter.getTask.mockResolvedValue(mockTask);

      const req = {
        providerConfig: {
          userId: '123',
          apiKey: '123123123',
          apiUrl: ':)',
          locale: 'de-DE',
        },
        params: { id: '123' },
      } as IdBridgeRequest<Task>;

      const result = await controller.findById(
        req,
        mockResponse as unknown as Response,
        mockNext,
      );

      expect(result).toBeUndefined();
      expect(mockAdapter.getTask).toHaveBeenCalledWith(
        req.providerConfig,
        req.params.id,
      );
      expect(mockResponse.json).toHaveBeenCalledWith(mockTask);
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
