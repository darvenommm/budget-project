import { UserRepository } from '../domain/user.repository.js';
import { TokenRepository } from '../infrastructure/token.repository.prisma.js';
import { hashPassword, verifyPassword } from './password.service.js';
import {
  generateTokenPair,
  verifyRefreshToken,
  getRefreshTokenExpiry,
  TokenPair,
} from './jwt.service.js';
import { logger } from '../../../shared/logger/index.js';

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
    private tokenRepository: TokenRepository
  ) {}

  async register(input: RegisterInput): Promise<TokenPair> {
    const existingUser = await this.userRepository.findByEmail(input.email);
    if (existingUser) {
      throw new Error('Email already registered');
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
      getRefreshTokenExpiry()
    );

    return tokens;
  }

  async login(input: LoginInput): Promise<TokenPair> {
    const user = await this.userRepository.findByEmail(input.email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await verifyPassword(input.password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    logger.info('User logged in', { userId: user.id });

    const tokens = generateTokenPair(user.id);
    await this.tokenRepository.saveRefreshToken(
      user.id,
      tokens.refreshToken,
      getRefreshTokenExpiry()
    );

    return tokens;
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const storedToken = await this.tokenRepository.findRefreshToken(refreshToken);
    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new Error('Invalid refresh token');
    }

    const payload = verifyRefreshToken(refreshToken);

    await this.tokenRepository.deleteRefreshToken(refreshToken);

    const tokens = generateTokenPair(payload.userId);
    await this.tokenRepository.saveRefreshToken(
      payload.userId,
      tokens.refreshToken,
      getRefreshTokenExpiry()
    );

    return tokens;
  }

  async logout(refreshToken: string): Promise<void> {
    await this.tokenRepository.deleteRefreshToken(refreshToken);
    logger.info('User logged out');
  }
}
