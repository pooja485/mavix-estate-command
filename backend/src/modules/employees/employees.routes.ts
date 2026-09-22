import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { buildCrudRouter } from '../../utils/crudFactory';
import { htmlSafeString } from '../../utils/sanitize';

const schema = z.object({
  code: z.string().min(1),
  name: htmlSafeString(z.string().min(1)),
  design: htmlSafeString(z.string().min(1)),
  dept: z.string().min(1),
  project: z.string().min(1),
  tasks: z.number().int().nonnegative().default(0),
  perf: z.number().int().min(0).max(100).default(0),
  status: z.string().default('Present'),
  phone: z.string().default(''),
  email: z.string().default(''),
});

export default buildCrudRouter({ model: prisma.employee, createSchema: schema, orderBy: { name: 'asc' } });
