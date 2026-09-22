import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';

const app = createApp();

// These tests exercise the real DB (a Postgres service is provided in CI —
// see .github/workflows/ci.yml). They double as a regression check that
// tenant isolation actually holds: tenant B must never see tenant A's data.

describe('auth + tenant isolation', () => {
  const slugA = `test-tenant-a-${Date.now()}`;
  const slugB = `test-tenant-b-${Date.now()}`;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    const signupA = await request(app).post('/api/auth/signup').send({
      companyName: 'Tenant A Co',
      slug: slugA,
      adminName: 'Admin A',
      email: 'admin@a.test',
      password: 'Password123!',
    });
    expect(signupA.status).toBe(201);
    tokenA = signupA.body.data.accessToken;

    const signupB = await request(app).post('/api/auth/signup').send({
      companyName: 'Tenant B Co',
      slug: slugB,
      adminName: 'Admin B',
      email: 'admin@b.test',
      password: 'Password123!',
    });
    expect(signupB.status).toBe(201);
    tokenB = signupB.body.data.accessToken;
  });

  afterAll(async () => {
    await prisma.tenant.deleteMany({ where: { slug: { in: [slugA, slugB] } } });
    await prisma.$disconnect();
  });

  it('rejects requests with no token', async () => {
    const res = await request(app).get('/api/leads');
    expect(res.status).toBe(401);
  });

  it('lets tenant A create a lead visible only to tenant A', async () => {
    const created = await request(app)
      .post('/api/leads')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        code: 'LD-TEST-1',
        name: 'Test Lead',
        phone: '9999999999',
        email: 'lead@test.com',
        source: 'Referral',
        project: 'Test Project',
        budget: '1 Cr',
        type: '2 BHK',
        timeline: '3 months',
        exec: 'Test Exec',
        last: '01 Jan 2026',
        next: '02 Jan 2026',
      });
    expect(created.status).toBe(201);

    const listA = await request(app).get('/api/leads').set('Authorization', `Bearer ${tokenA}`);
    expect(listA.body.data.some((l: any) => l.code === 'LD-TEST-1')).toBe(true);

    const listB = await request(app).get('/api/leads').set('Authorization', `Bearer ${tokenB}`);
    expect(listB.body.data.some((l: any) => l.code === 'LD-TEST-1')).toBe(false);
  });

  it('logs in with correct credentials and rejects wrong password', async () => {
    const ok = await request(app)
      .post('/api/auth/login')
      .send({ tenantSlug: slugA, email: 'admin@a.test', password: 'Password123!' });
    expect(ok.status).toBe(200);

    const bad = await request(app)
      .post('/api/auth/login')
      .send({ tenantSlug: slugA, email: 'admin@a.test', password: 'WrongPassword!' });
    expect(bad.status).toBe(401);
  });
});
