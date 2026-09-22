import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { buildCrudRouter } from '../../utils/crudFactory';

const schema = z.object({
  project: z.string().min(1),
  data: z.record(z.any()),
});

export default buildCrudRouter({ model: prisma.portfolioItem, createSchema: schema, orderBy: { project: 'asc' } });
