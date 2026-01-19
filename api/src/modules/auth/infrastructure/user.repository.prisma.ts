import { prisma } from '../../../shared/database/index.ts';
import type { User, CreateUserData } from '../domain/user.entity.ts';
import type { UserRepository } from '../domain/user.repository.ts';
import { LatencyHistogram } from '../../../shared/decorators/latency-histogram.ts';

export class PrismaUserRepository implements UserRepository {
  @LatencyHistogram('db_user')
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  @LatencyHistogram('db_user')
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  @LatencyHistogram('db_user')
  async create(data: CreateUserData): Promise<User> {
    return prisma.user.create({ data });
  }
}
