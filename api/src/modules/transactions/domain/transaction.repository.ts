import { Decimal } from '@prisma/client/runtime/library';
import {
  Transaction,
  CreateTransactionData,
  UpdateTransactionData,
  TransactionFilter,
  CategorySpending,
} from './transaction.entity.js';

export interface TransactionRepository {
  findById(id: string): Promise<Transaction | null>;
  findByFilter(filter: TransactionFilter): Promise<Transaction[]>;
  create(data: CreateTransactionData): Promise<Transaction>;
  update(id: string, data: UpdateTransactionData): Promise<Transaction>;
  delete(id: string): Promise<void>;
  getCategorySpendingForMonth(
    userId: string,
    categoryId: string,
    month: number,
    year: number
  ): Promise<Decimal>;
  getAllCategorySpendingsForMonth(
    userId: string,
    month: number,
    year: number
  ): Promise<CategorySpending[]>;
}
