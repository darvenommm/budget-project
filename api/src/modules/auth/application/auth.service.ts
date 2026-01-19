import type { UserRepository } from '../domain/user.repository.ts';
import type { TokenRepository } from '../infrastructure/token.repository.prisma.ts';
import { hashPassword, verifyPassword } from './password.service.ts';
import type { TokenPair } from './jwt.service.ts';
import { generateTokenPair, verifyRefreshToken, getRefreshTokenExpiry } from './jwt.service.ts';
import { logger } from '../../../shared/logger/index.ts';
import { ConflictError, UnauthorizedError } from '../../../shared/errors/index.ts';

export interface RegisterInput {
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private tokenRepository: TokenRepository,
  ) {}

  async register(input: RegisterInput): Promise<TokenPair> {
    const existingUser = await this.userRepository.findByEmail(input.email);
    if (existingUser) {
      throw new ConflictError('EMAIL_ALREADY_REGISTERED', 'Email already registered');
    }

    const passwordHash = await hashPassword(input.password);
    const user = await this.userRepository.create({
      email: input.email,
      passwordHash,
    });

    logger.info('User registered', { userId: user.id, email: user.email });

    const tokens = generateTokenPair(user.id);
    await this.tokenRepository.saveRefreshToken(
      user.id,
      tokens.refreshToken,
      getRefreshTokenExpiry(),
    );

    return tokens;
  }

  async login(input: LoginInput): Promise<TokenPair> {
    const user = await this.userRepository.findByEmail(input.email);
    if (!user) {
      throw new UnauthorizedError('INVALID_CREDENTIALS', 'Invalid credentials');
    }

    const isValidPassword = await verifyPassword(input.password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedError('INVALID_CREDENTIALS', 'Invalid credentials');
    }

    logger.info('User logged in', { userId: user.id });

    const tokens = generateTokenPair(user.id);
    await this.tokenRepository.saveRefreshToken(
      user.id,
      tokens.refreshToken,
      getRefreshTokenExpiry(),
    );

    return tokens;
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const storedToken = await this.tokenRepository.findRefreshToken(refreshToken);
    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedError('INVALID_REFRESH_TOKEN', 'Invalid refresh token');
    }

    const payload = verifyRefreshToken(refreshToken);

    await this.tokenRepository.deleteRefreshToken(refreshToken);

    const tokens = generateTokenPair(payload.userId);
    await this.tokenRepository.saveRefreshToken(
      payload.userId,
      tokens.refreshToken,
      getRefreshTokenExpiry(),
    );

    return tokens;
  }

  async logout(refreshToken: string): Promise<void> {
    await this.tokenRepository.deleteRefreshToken(refreshToken);
    logger.info('User logged out');
  }
}
