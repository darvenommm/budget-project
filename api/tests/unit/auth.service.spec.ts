import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { AuthService } from '../../src/modules/auth/application/auth.service.js';
import { hashPassword } from '../../src/modules/auth/application/password.service.js';

describe('AuthService', () => {
  const mockUserRepository = {
    findByEmail: mock(() => Promise.resolve(null)),
    findById: mock(() => Promise.resolve(null)),
    create: mock(() => Promise.resolve(null)),
  };

  const mockTokenRepository = {
    saveRefreshToken: mock(() => Promise.resolve({})),
    findRefreshToken: mock(() => Promise.resolve(null)),
    deleteRefreshToken: mock(() => Promise.resolve()),
    deleteAllUserTokens: mock(() => Promise.resolve()),
  };

  let authService: AuthService;

  beforeEach(() => {
    mockUserRepository.findByEmail.mockReset();
    mockUserRepository.findById.mockReset();
    mockUserRepository.create.mockReset();
    mockTokenRepository.saveRefreshToken.mockReset();
    mockTokenRepository.findRefreshToken.mockReset();
    mockTokenRepository.deleteRefreshToken.mockReset();
    mockTokenRepository.deleteAllUserTokens.mockReset();
    authService = new AuthService(mockUserRepository, mockTokenRepository);
  });

  describe('register', () => {
    it('should register a new user and return tokens', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockTokenRepository.saveRefreshToken.mockResolvedValue({});

      const result = await authService.register({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(mockUserRepository.create).toHaveBeenCalled();
    });

    it('should throw error if email already registered', async () => {
      mockUserRepository.findByEmail.mockResolvedValue({ id: 'existing' });

      expect(
        authService.register({
          email: 'test@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Email already registered');
    });
  });

  describe('login', () => {
    it('should login and return tokens', async () => {
      const passwordHash = await hashPassword('password123');
      mockUserRepository.findByEmail.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        passwordHash,
      });
      mockTokenRepository.saveRefreshToken.mockResolvedValue({});

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw error for invalid credentials', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      expect(
        authService.login({
          email: 'test@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Invalid credentials');
    });
  });
});
