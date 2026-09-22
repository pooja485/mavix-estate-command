import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { buildCrudRouter } from '../../utils/crudFactory';

const schema = z.object({
  tower: z.string().min(1),
  floor: z.string().min(1),
  activity: z.string().min(1),
  contractor: z.string().min(1),
  planned: z.number().int().min(0).max(100),
  actual: z.number().int().min(0).max(100),
  delay: z.number().int().default(0),
  eng: z.string().min(1),
  status: z.string().default('On Track'),
});

export default buildCrudRouter({ model: prisma.progressItem, createSchema: schema, orderBy: { createdAt: 'desc' } });
