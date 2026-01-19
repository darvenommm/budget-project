import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { AuthService } from '../../src/modules/auth/application/auth.service.ts';
import { hashPassword } from '../../src/modules/auth/application/password.service.ts';
import type { UserRepository } from '../../src/modules/auth/domain/user.repository.ts';
import type {
  TokenRepository,
  RefreshToken,
} from '../../src/modules/auth/infrastructure/token.repository.prisma.ts';
import type { User } from '../../src/modules/auth/domain/user.entity.ts';
import type { CategoryService } from '../../src/modules/categories/application/category.service.ts';

// Helper for testing async rejections (Bun test types don't properly type expect().rejects as Promise)
async function expectToRejectWith(promise: Promise<unknown>, message: string): Promise<void> {
  try {
    await promise;
    throw new Error('Expected promise to reject but it resolved');
  } catch (error) {
    if (error instanceof Error && error.message === 'Expected promise to reject but it resolved') {
      throw error;
    }
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe(message);
  }
}

describe('AuthService', () => {
  const createMockUser = (overrides: Partial<User> = {}): User => ({
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: 'hashed',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  const createMockRefreshToken = (): RefreshToken => ({
    id: 'token-123',
    userId: 'user-123',
    token: 'refresh-token',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  // Store mock functions separately to avoid unbound-method issues
  const findByEmailMock = mock(() => Promise.resolve(null as User | null));
  const findByIdMock = mock(() => Promise.resolve(null as User | null));
  const createUserMock = mock(() => Promise.resolve(createMockUser()));
  const saveRefreshTokenMock = mock(() => Promise.resolve(createMockRefreshToken()));
  const findRefreshTokenMock = mock(() => Promise.resolve(null as RefreshToken | null));
  const deleteRefreshTokenMock = mock(() => Promise.resolve());
  const deleteAllUserTokensMock = mock(() => Promise.resolve());

  const mockUserRepository: UserRepository = {
    findByEmail: findByEmailMock,
    findById: findByIdMock,
    create: createUserMock,
  };

  const mockTokenRepository: TokenRepository = {
    saveRefreshToken: saveRefreshTokenMock,
    findRefreshToken: findRefreshTokenMock,
    deleteRefreshToken: deleteRefreshTokenMock,
    deleteAllUserTokens: deleteAllUserTokensMock,
  };

  const createDefaultCategoriesMock = mock(() => Promise.resolve());

  const mockCategoryService = {
    createDefaultCategories: createDefaultCategoriesMock,
  } as unknown as CategoryService;

  let authService: AuthService;

  beforeEach(() => {
    findByEmailMock.mockReset();
    findByIdMock.mockReset();
    createUserMock.mockReset();
    saveRefreshTokenMock.mockReset();
    findRefreshTokenMock.mockReset();
    deleteRefreshTokenMock.mockReset();
    deleteAllUserTokensMock.mockReset();
    createDefaultCategoriesMock.mockReset();
    authService = new AuthService(mockUserRepository, mockTokenRepository, mockCategoryService);
  });

  describe('register', () => {
    it('should register a new user and return tokens', async () => {
      findByEmailMock.mockResolvedValue(null);
      createUserMock.mockResolvedValue(createMockUser());

      const result = await authService.register({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(createUserMock).toHaveBeenCalled();
    });

    it('should throw error if email already registered', async () => {
      findByEmailMock.mockResolvedValue(createMockUser({ id: 'existing' }));

      await expectToRejectWith(
        authService.register({
          email: 'test@example.com',
          password: 'password123',
        }),
        'Email already registered',
      );
    });
  });

  describe('login', () => {
    it('should login and return tokens', async () => {
      const passwordHash = await hashPassword('password123');
      findByEmailMock.mockResolvedValue(createMockUser({ passwordHash }));

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw error for invalid credentials', async () => {
      findByEmailMock.mockResolvedValue(null);

      await expectToRejectWith(
        authService.login({
          email: 'test@example.com',
          password: 'password123',
        }),
        'Invalid credentials',
      );
    });
  });
});
