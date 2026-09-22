import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { buildCrudRouter } from '../../utils/crudFactory';

const schema = z.object({
  mat: z.string().min(1),
  unit: z.string().min(1),
  opening: z.number().int().nonnegative(),
  received: z.number().int().nonnegative(),
  consumed: z.number().int().nonnegative(),
  closing: z.number().int().nonnegative(),
  min: z.number().int().nonnegative(),
  value: z.number().nonnegative(),
  alert: z.string().default(''),
});

export default buildCrudRouter({ model: prisma.materialItem, createSchema: schema, orderBy: { mat: 'asc' } });
