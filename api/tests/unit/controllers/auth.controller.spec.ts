import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { AuthController } from '../../../src/modules/auth/api/auth.controller.ts';
import type { AuthService } from '../../../src/modules/auth/application/auth.service.ts';
import type { FastifyRequest, FastifyReply } from 'fastify';

// Helper for testing async rejections (Bun test types don't properly type expect().rejects as Promise)
async function expectToReject(promise: Promise<unknown>): Promise<void> {
  try {
    await promise;
    throw new Error('Expected promise to reject but it resolved');
  } catch (error) {
    if (error instanceof Error && error.message === 'Expected promise to reject but it resolved') {
      throw error;
    }
    // Expected rejection occurred
  }
}

// Noop function for mocks
const noop = (): void => {
  // intentionally empty
};

describe('AuthController', () => {
  let controller: AuthController;
  let mockService: {
    register: ReturnType<typeof mock>;
    login: ReturnType<typeof mock>;
    refresh: ReturnType<typeof mock>;
    logout: ReturnType<typeof mock>;
  };
  let mockReply: {
    status: ReturnType<typeof mock>;
    send: ReturnType<typeof mock>;
  };

  beforeEach(() => {
    mockService = {
      register: mock(() => Promise.resolve({ accessToken: 'token', refreshToken: 'refresh' })),
      login: mock(() => Promise.resolve({ accessToken: 'token', refreshToken: 'refresh' })),
      refresh: mock(() => Promise.resolve({ accessToken: 'token', refreshToken: 'refresh' })),
      logout: mock(() => Promise.resolve()),
    };

    controller = new AuthController(mockService as unknown as AuthService);

    mockReply = {
      status: mock(function (this: typeof mockReply) {
        return this;
      }),
      send: mock(noop),
    };
  });

  describe('register', () => {
    it('should return 201 with tokens for valid registration', async () => {
      const tokens = { accessToken: 'access-token', refreshToken: 'refresh-token' };
      mockService.register.mockImplementation(() => Promise.resolve(tokens));

      const mockRequest = {
        body: {
          email: 'test@example.com',
          password: 'password123',
        },
      } as unknown as FastifyRequest;

      await controller.register(mockRequest, mockReply as unknown as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(201);
      expect(mockReply.send).toHaveBeenCalledWith(tokens);
    });

    it('should throw ValidationError for invalid email', async () => {
      const mockRequest = {
        body: {
          email: 'invalid-email',
          password: 'password123',
        },
      } as unknown as FastifyRequest;

      await expectToReject(controller.register(mockRequest, mockReply as unknown as FastifyReply));
    });

    it('should throw ValidationError for short password', async () => {
      const mockRequest = {
        body: {
          email: 'test@example.com',
          password: '123',
        },
      } as unknown as FastifyRequest;

      await expectToReject(controller.register(mockRequest, mockReply as unknown as FastifyReply));
    });

    it('should throw ValidationError for missing email', async () => {
      const mockRequest = {
        body: {
          password: 'password123',
        },
      } as unknown as FastifyRequest;

      await expectToReject(controller.register(mockRequest, mockReply as unknown as FastifyReply));
    });
  });

  describe('login', () => {
    it('should return tokens for valid login', async () => {
      const tokens = { accessToken: 'access-token', refreshToken: 'refresh-token' };
      mockService.login.mockImplementation(() => Promise.resolve(tokens));

      const mockRequest = {
        body: {
          email: 'test@example.com',
          password: 'password123',
        },
      } as unknown as FastifyRequest;

      await controller.login(mockRequest, mockReply as unknown as FastifyReply);

      expect(mockService.login).toHaveBeenCalled();
      expect(mockReply.send).toHaveBeenCalledWith(tokens);
    });

    it('should throw ValidationError for missing password', async () => {
      const mockRequest = {
        body: {
          email: 'test@example.com',
        },
      } as unknown as FastifyRequest;

      await expectToReject(controller.login(mockRequest, mockReply as unknown as FastifyReply));
    });
  });

  describe('refresh', () => {
    it('should return new tokens for valid refresh token', async () => {
      const tokens = { accessToken: 'new-access', refreshToken: 'new-refresh' };
      mockService.refresh.mockImplementation(() => Promise.resolve(tokens));

      const mockRequest = {
        body: {
          refreshToken: 'valid-refresh-token',
        },
      } as unknown as FastifyRequest;

      await controller.refresh(mockRequest, mockReply as unknown as FastifyReply);

      expect(mockService.refresh).toHaveBeenCalledWith('valid-refresh-token');
      expect(mockReply.send).toHaveBeenCalledWith(tokens);
    });

    it('should throw ValidationError for missing refresh token', async () => {
      const mockRequest = {
        body: {},
      } as unknown as FastifyRequest;

      await expectToReject(controller.refresh(mockRequest, mockReply as unknown as FastifyReply));
    });
  });

  describe('logout', () => {
    it('should return 204 for successful logout', async () => {
      mockService.logout.mockImplementation(() => Promise.resolve());

      const mockRequest = {
        body: {
          refreshToken: 'valid-refresh-token',
        },
      } as unknown as FastifyRequest;

      await controller.logout(mockRequest, mockReply as unknown as FastifyReply);

      expect(mockService.logout).toHaveBeenCalledWith('valid-refresh-token');
      expect(mockReply.status).toHaveBeenCalledWith(204);
    });
  });

  describe('me', () => {
    it('should return user data', () => {
      const mockRequest = {
        user: { id: 'user-id', email: 'test@example.com' },
      } as unknown as FastifyRequest;

      controller.me(mockRequest, mockReply as unknown as FastifyReply);

      expect(mockReply.send).toHaveBeenCalledWith({
        id: 'user-id',
        email: 'test@example.com',
      });
    });

    it('should throw UnauthorizedError when no user', () => {
      const mockRequest = {
        user: undefined,
      } as unknown as FastifyRequest;

      expect(() => {
        controller.me(mockRequest, mockReply as unknown as FastifyReply);
      }).toThrow();
    });
  });
});
