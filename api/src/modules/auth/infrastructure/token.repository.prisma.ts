import { prisma } from '../../../shared/database/index.ts';
import { LatencyHistogram } from '../../../shared/decorators/latency-histogram.ts';

export interface RefreshToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
}

export interface TokenRepository {
  saveRefreshToken(userId: string, token: string, expiresAt: Date): Promise<RefreshToken>;
  findRefreshToken(token: string): Promise<RefreshToken | null>;
  deleteRefreshToken(token: string): Promise<void>;
  deleteAllUserTokens(userId: string): Promise<void>;
}

export class PrismaTokenRepository implements TokenRepository {
  @LatencyHistogram('db_token')
  async saveRefreshToken(userId: string, token: string, expiresAt: Date): Promise<RefreshToken> {
    return prisma.refreshToken.create({
      data: { userId, token, expiresAt },
    });
  }

  @LatencyHistogram('db_token')
  async findRefreshToken(token: string): Promise<RefreshToken | null> {
    return prisma.refreshToken.findUnique({ where: { token } });
  }

  @LatencyHistogram('db_token')
  async deleteRefreshToken(token: string): Promise<void> {
    await prisma.refreshToken.delete({ where: { token } }).catch(() => {
      /* Token may already be deleted */
    });
  }

  @LatencyHistogram('db_token')
  async deleteAllUserTokens(userId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { userId } });
  }
}
