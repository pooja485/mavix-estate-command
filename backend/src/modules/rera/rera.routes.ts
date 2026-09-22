import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { buildCrudRouter } from '../../utils/crudFactory';

const schema = z.object({
  project: z.string().min(1),
  reraNo: z.string().min(1),
  accountNo: z.string().min(1),
  balance: z.number().int().nonnegative(),
  withdrawable: z.number().int().nonnegative(),
});

export default buildCrudRouter({ model: prisma.reraAccount, createSchema: schema, orderBy: { project: 'asc' } });
