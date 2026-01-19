import jwt from 'jsonwebtoken';
import { jwtConfig } from '../../../config/index.ts';

export interface TokenPayload {
  userId: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

function parseExpiresIn(value: string): number {
  const match = value.match(/^(\d+)([smhd])$/);
  if (!match?.[1] || !match[2]) {
    return 900; // default 15 minutes in seconds
  }

  const num = parseInt(match[1], 10);
  const unit = match[2] as 's' | 'm' | 'h' | 'd';

  const multipliers = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 24 * 60 * 60,
  } as const;

  return num * multipliers[unit];
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
  return jwt.verify(token, jwtConfig.accessSecret) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, jwtConfig.refreshSecret) as TokenPayload;
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
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // default 7 days
  }

  const value = parseInt(match[1], 10);
  const unit = match[2] as 's' | 'm' | 'h' | 'd';

  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  } as const;

  return new Date(Date.now() + value * multipliers[unit]);
}
