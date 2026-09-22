import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { buildCrudRouter } from '../../utils/crudFactory';

const schema = z.object({
  date: z.string().min(1),
  tower: z.string().min(1),
  floor: z.string().min(1),
  activity: z.string().min(1),
  contractor: z.string().min(1),
  planned: z.number().int().min(0).max(100),
  actual: z.number().int().min(0).max(100),
  labour: z.number().int().nonnegative().default(0),
  weather: z.string().default(''),
  status: z.string().default('Submitted'),
});

export default buildCrudRouter({ model: prisma.dprRecord, createSchema: schema, orderBy: { createdAt: 'desc' } });
