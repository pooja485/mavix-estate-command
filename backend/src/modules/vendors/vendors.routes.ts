import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { buildCrudRouter } from '../../utils/crudFactory';
import { htmlSafeString } from '../../utils/sanitize';

const schema = z.object({
  code: z.string().min(1),
  name: htmlSafeString(z.string().min(1)),
  cat: z.string().min(1),
  contact: htmlSafeString(z.string().min(1)),
  projects: z.string().default(''),
  value: z.string().default(''),
  outstanding: z.string().default(''),
  quality: z.number().int().min(0).max(100).default(0),
  delivery: z.number().int().min(0).max(100).default(0),
  risk: z.string().default('Low'),
});

export default buildCrudRouter({ model: prisma.vendor, createSchema: schema, orderBy: { name: 'asc' } });
