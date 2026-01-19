import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { AuthController } from '../../../src/modules/auth/api/auth.controller.ts';
import type { AuthService } from '../../../src/modules/auth/application/auth.service.ts';
import {
  createMockRequest,
  createMockReply,
  expectToReject,
} from '../../helpers/mock-factories.ts';

describe('AuthController', () => {
  let controller: AuthController;
  let mockService: {
    register: ReturnType<typeof mock>;
    login: ReturnType<typeof mock>;
    refresh: ReturnType<typeof mock>;
    logout: ReturnType<typeof mock>;
  };
  let mockReply: ReturnType<typeof createMockReply>;

  beforeEach(() => {
    mockService = {
      register: mock(() => Promise.resolve({ accessToken: 'token', refreshToken: 'refresh' })),
      login: mock(() => Promise.resolve({ accessToken: 'token', refreshToken: 'refresh' })),
      refresh: mock(() => Promise.resolve({ accessToken: 'token', refreshToken: 'refresh' })),
      logout: mock(() => Promise.resolve()),
    };

    controller = new AuthController(mockService as unknown as AuthService);
    mockReply = createMockReply();
  });

  describe('register', () => {
    it('should return 201 with tokens for valid registration', async () => {
      const tokens = { accessToken: 'access-token', refreshToken: 'refresh-token' };
      mockService.register.mockImplementation(() => Promise.resolve(tokens));

      const mockRequest = createMockRequest({
        body: {
          email: 'test@example.com',
          password: 'password123',
        },
      });

      await controller.register(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(201);
      expect(mockReply.send).toHaveBeenCalledWith(tokens);
    });

    it('should throw ValidationError for invalid email', async () => {
      const mockRequest = createMockRequest({
        body: {
          email: 'invalid-email',
          password: 'password123',
        },
      });

      await expectToReject(controller.register(mockRequest, mockReply));
    });

    it('should throw ValidationError for short password', async () => {
      const mockRequest = createMockRequest({
        body: {
          email: 'test@example.com',
          password: '123',
        },
      });

      await expectToReject(controller.register(mockRequest, mockReply));
    });

    it('should throw ValidationError for missing email', async () => {
      const mockRequest = createMockRequest({
        body: {
          password: 'password123',
        },
      });

      await expectToReject(controller.register(mockRequest, mockReply));
    });
  });

  describe('login', () => {
    it('should return tokens for valid login', async () => {
      const tokens = { accessToken: 'access-token', refreshToken: 'refresh-token' };
      mockService.login.mockImplementation(() => Promise.resolve(tokens));

      const mockRequest = createMockRequest({
        body: {
          email: 'test@example.com',
          password: 'password123',
        },
      });

      await controller.login(mockRequest, mockReply);

      expect(mockService.login).toHaveBeenCalled();
      expect(mockReply.send).toHaveBeenCalledWith(tokens);
    });

    it('should throw ValidationError for missing password', async () => {
      const mockRequest = createMockRequest({
        body: {
          email: 'test@example.com',
        },
      });

      await expectToReject(controller.login(mockRequest, mockReply));
    });
  });

  describe('refresh', () => {
    it('should return new tokens for valid refresh token', async () => {
      const tokens = { accessToken: 'new-access', refreshToken: 'new-refresh' };
      mockService.refresh.mockImplementation(() => Promise.resolve(tokens));

      const mockRequest = createMockRequest({
        body: {
          refreshToken: 'valid-refresh-token',
        },
      });

      await controller.refresh(mockRequest, mockReply);

      expect(mockService.refresh).toHaveBeenCalledWith('valid-refresh-token');
      expect(mockReply.send).toHaveBeenCalledWith(tokens);
    });

    it('should throw ValidationError for missing refresh token', async () => {
      const mockRequest = createMockRequest({
        body: {},
      });

      await expectToReject(controller.refresh(mockRequest, mockReply));
    });
  });

  describe('logout', () => {
    it('should return 204 for successful logout', async () => {
      mockService.logout.mockImplementation(() => Promise.resolve());

      const mockRequest = createMockRequest({
        body: {
          refreshToken: 'valid-refresh-token',
        },
      });

      await controller.logout(mockRequest, mockReply);

      expect(mockService.logout).toHaveBeenCalledWith('valid-refresh-token');
      expect(mockReply.status).toHaveBeenCalledWith(204);
    });
  });

  describe('me', () => {
    it('should return user data', () => {
      const mockRequest = createMockRequest({
        user: { id: 'user-id', email: 'test@example.com' },
      });

      controller.me(mockRequest, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith({
        id: 'user-id',
        email: 'test@example.com',
      });
    });

    it('should throw UnauthorizedError when no user', () => {
      const mockRequest = createMockRequest({});

      expect(() => {
        controller.me(mockRequest, mockReply);
      }).toThrow();
    });
  });
});
