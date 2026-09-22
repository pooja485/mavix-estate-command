import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { buildCrudRouter } from '../../utils/crudFactory';

const schema = z.object({
  time: z.string().min(1),
  module: z.string().min(1),
  action: z.string().min(1),
  entity: z.string().min(1),
  result: z.string().default(''),
  value: z.string().default(''),
});

// AI logs are append-only from the frontend's point of view (create + read).
export default buildCrudRouter({ model: prisma.aiLog, createSchema: schema, orderBy: { createdAt: 'desc' } });
