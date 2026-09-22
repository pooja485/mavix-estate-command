import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { buildCrudRouter } from '../../utils/crudFactory';

const schema = z.object({
  code: z.string().min(1),
  project: z.string().min(1),
  tower: z.string().min(1),
  floor: z.string().min(1),
  unitNo: z.string().min(1),
  type: z.string().min(1),
  carpet: z.number().int().positive(),
  base: z.number().int().nonnegative(),
  status: z.string().default('Available'),
  customer: z.string().default(''),
  bookDate: z.string().default(''),
});

export default buildCrudRouter({ model: prisma.unit, createSchema: schema, orderBy: { code: 'asc' } });
