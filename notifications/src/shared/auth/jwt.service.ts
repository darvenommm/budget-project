import jwt from 'jsonwebtoken';
import { jwtConfig } from '../../config/index.ts';

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

export function verifyAccessToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, jwtConfig.accessSecret);
  if (!isTokenPayload(decoded)) {
    throw new Error('Invalid token payload');
  }
  return decoded;
}
