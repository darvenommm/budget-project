import jwt from 'jsonwebtoken';
import { jwtConfig } from '../../../config/index.ts';
import {
  DEFAULT_ACCESS_TOKEN_EXPIRY_SECONDS,
  DEFAULT_REFRESH_TOKEN_EXPIRY_DAYS,
  TIME_MULTIPLIERS_SECONDS,
  TIME_MULTIPLIERS_MS,
} from '../../../shared/constants/index.ts';

export interface TokenPayload {
  userId: string;
  iat?: number;
  exp?: number;
}

function isTokenPayload(payload: unknown): payload is TokenPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'userId' in payload &&
    typeof (payload as TokenPayload).userId === 'string'
  );
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

function parseExpiresIn(value: string): number {
  const match = value.match(/^(\d+)([smhd])$/);
  if (!match?.[1] || !match[2]) {
    return DEFAULT_ACCESS_TOKEN_EXPIRY_SECONDS;
  }

  const num = parseInt(match[1], 10);
  const unit = match[2] as keyof typeof TIME_MULTIPLIERS_SECONDS;

  return num * TIME_MULTIPLIERS_SECONDS[unit];
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, jwtConfig.accessSecret, {
    expiresIn: parseExpiresIn(jwtConfig.accessExpiresIn),
  });
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, jwtConfig.refreshSecret, {
    expiresIn: parseExpiresIn(jwtConfig.refreshExpiresIn),
  });
}

export function verifyAccessToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, jwtConfig.accessSecret);
  if (!isTokenPayload(decoded)) {
    throw new Error('Invalid token payload');
  }
  return decoded;
}

export function verifyRefreshToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, jwtConfig.refreshSecret);
  if (!isTokenPayload(decoded)) {
    throw new Error('Invalid token payload');
  }
  return decoded;
}

export function generateTokenPair(userId: string): TokenPair {
  return {
    accessToken: generateAccessToken({ userId }),
    refreshToken: generateRefreshToken({ userId }),
  };
}

export function getRefreshTokenExpiry(): Date {
  const match = jwtConfig.refreshExpiresIn.match(/^(\d+)([dhms])$/);
  if (!match?.[1] || !match[2]) {
    return new Date(Date.now() + DEFAULT_REFRESH_TOKEN_EXPIRY_DAYS * TIME_MULTIPLIERS_MS.d);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2] as keyof typeof TIME_MULTIPLIERS_MS;

  return new Date(Date.now() + value * TIME_MULTIPLIERS_MS[unit]);
}
