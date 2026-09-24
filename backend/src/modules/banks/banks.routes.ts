import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { buildCrudRouter } from '../../utils/crudFactory';

const schema = z.object({
  bankName: z.string().min(1),
  accountNo: z.string().min(1),
  type: z.string().min(1),
  balance: z.number().int().nonnegative(),
  project: z.string().default('Corporate'),
});

export default buildCrudRouter({
  model: prisma.bankAccount,
  createSchema: schema,
  orderBy: { bankName: 'asc' },
  writeRoles: ['SUPER_ADMIN', 'MANAGING_DIRECTOR', 'CFO'],
});