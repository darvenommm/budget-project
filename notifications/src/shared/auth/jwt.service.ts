import jwt from 'jsonwebtoken';
import { jwtConfig } from '../../config/index.js';

export interface TokenPayload {
  userId: string;
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, jwtConfig.accessSecret) as TokenPayload;
}
