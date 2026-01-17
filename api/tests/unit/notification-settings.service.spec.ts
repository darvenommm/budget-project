import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { NotificationSettingsService } from '../../src/modules/notifications/application/notification-settings.service.js';

describe('NotificationSettingsService', () => {
  const mockRepository = {
    findByUserId: mock(() => Promise.resolve(null)),
    create: mock(() => Promise.resolve(null)),
    update: mock(() => Promise.resolve(null)),
    upsert: mock(() => Promise.resolve(null)),
  };

  let service: NotificationSettingsService;

  beforeEach(() => {
    mockRepository.findByUserId.mockReset();
    mockRepository.create.mockReset();
    mockRepository.update.mockReset();
    mockRepository.upsert.mockReset();
    service = new NotificationSettingsService(mockRepository);
  });

  describe('get', () => {
    it('should return settings if found', async () => {
      const mockSettings = {
        id: 'settings-123',
        userId: 'user-123',
        telegramChatId: '12345',
        notifyLimitExceeded: true,
        notifyGoalReached: true,
      };

      mockRepository.findByUserId.mockResolvedValue(mockSettings);

      const result = await service.get('user-123');

      expect(result).toEqual(mockSettings);
      expect(mockRepository.findByUserId).toHaveBeenCalledWith('user-123');
    });

    it('should return null if not found', async () => {
      mockRepository.findByUserId.mockResolvedValue(null);

      const result = await service.get('user-123');

      expect(result).toBeNull();
    });
  });

  describe('getOrCreate', () => {
    it('should return existing settings', async () => {
      const mockSettings = {
        id: 'settings-123',
        userId: 'user-123',
        telegramChatId: null,
        notifyLimitExceeded: true,
        notifyGoalReached: true,
      };

      mockRepository.findByUserId.mockResolvedValue(mockSettings);

      const result = await service.getOrCreate('user-123');

      expect(result).toEqual(mockSettings);
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should create new settings if not found', async () => {
      const mockSettings = {
        id: 'settings-123',
        userId: 'user-123',
        telegramChatId: null,
        notifyLimitExceeded: true,
        notifyGoalReached: true,
      };

      mockRepository.findByUserId.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(mockSettings);

      const result = await service.getOrCreate('user-123');

      expect(result).toEqual(mockSettings);
      expect(mockRepository.create).toHaveBeenCalledWith({ userId: 'user-123' });
    });
  });

  describe('update', () => {
    it('should update notification preferences', async () => {
      const mockSettings = {
        id: 'settings-123',
        userId: 'user-123',
        telegramChatId: null,
        notifyLimitExceeded: false,
        notifyGoalReached: true,
      };

      mockRepository.upsert.mockResolvedValue(mockSettings);

      const result = await service.update('user-123', {
        notifyLimitExceeded: false,
      });

      expect(result.notifyLimitExceeded).toBe(false);
      expect(mockRepository.upsert).toHaveBeenCalledWith('user-123', {
        notifyLimitExceeded: false,
      });
    });
  });

  describe('linkTelegram', () => {
    it('should link telegram chat id', async () => {
      const mockSettings = {
        id: 'settings-123',
        userId: 'user-123',
        telegramChatId: '12345',
        notifyLimitExceeded: true,
        notifyGoalReached: true,
      };

      mockRepository.upsert.mockResolvedValue(mockSettings);

      const result = await service.linkTelegram('user-123', '12345');

      expect(result.telegramChatId).toBe('12345');
      expect(mockRepository.upsert).toHaveBeenCalledWith('user-123', {
        telegramChatId: '12345',
      });
    });
  });

  describe('unlinkTelegram', () => {
    it('should unlink telegram chat id', async () => {
      const mockSettings = {
        id: 'settings-123',
        userId: 'user-123',
        telegramChatId: null,
        notifyLimitExceeded: true,
        notifyGoalReached: true,
      };

      mockRepository.upsert.mockResolvedValue(mockSettings);

      const result = await service.unlinkTelegram('user-123');

      expect(result.telegramChatId).toBeNull();
      expect(mockRepository.upsert).toHaveBeenCalledWith('user-123', {
        telegramChatId: null,
      });
    });
  });
});
