import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { buildCrudRouter } from '../../utils/crudFactory';
import { htmlSafeString } from '../../utils/sanitize';

const schema = z.object({
  code: z.string().min(1),
  date: z.string().min(1),
  cat: z.string().min(1),
  desc: htmlSafeString(z.string().min(1)),
  project: z.string().min(1),
  party: htmlSafeString(z.string().min(1)),
  mode: z.string().min(1),
  debit: z.number().int().nonnegative().default(0),
  credit: z.number().int().nonnegative().default(0),
  status: z.string().default('Pending'),
  enteredBy: z.string().min(1),
});

export default buildCrudRouter({
  model: prisma.transaction,
  createSchema: schema,
  orderBy: { createdAt: 'desc' },
  writeRoles: ['SUPER_ADMIN', 'MANAGING_DIRECTOR', 'CFO', 'ACCOUNTS_MANAGER'],
});
