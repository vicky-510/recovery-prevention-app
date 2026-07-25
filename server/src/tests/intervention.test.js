import crypto from 'node:crypto';
import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db/pool.js';

const email = `test-${crypto.randomUUID()}@example.test`;
const password = 'CorrectHorse9!';
let token;

beforeAll(async () => {
  const res = await request(app)
    .post('/api/auth/signup')
    .send({ email, password, role: 'person' });
  token = res.body.token;
});

afterAll(async () => {
  await pool.query('DELETE FROM users WHERE email = $1', [email]);
  await pool.end();
});

describe('authentication is enforced', () => {
  it.each([
    ['GET', '/api/interventions/categories'],
    ['POST', '/api/interventions'],
  ])('rejects %s %s without a token', async (method, path) => {
    const res = await request(app)[method.toLowerCase()](path);
    expect(res.status).toBe(401);
  });

  it('rejects a forged token', async () => {
    const res = await request(app)
      .get('/api/interventions/categories')
      .set('Authorization', 'Bearer forged.token');

    expect(res.status).toBe(401);
  });
});

describe('GET /api/interventions/categories', () => {
  it('returns the categories seeded in the database', async () => {
    const res = await request(app)
      .get('/api/interventions/categories')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.map((c) => c.code).sort()).toEqual([
      'caregiver_checkin',
      'craving',
      'panic',
      'post_relapse',
    ]);
    expect(res.body.every((c) => typeof c.label === 'string' && c.label.length > 0)).toBe(true);
  });
});

describe('POST /api/interventions validation', () => {
  // These reject before reaching Gemini, so they cost no API quota.
  it('rejects a missing category_code with 400', async () => {
    const res = await request(app)
      .post('/api/interventions')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('rejects an unknown category_code with 400', async () => {
    const res = await request(app)
      .post('/api/interventions')
      .set('Authorization', `Bearer ${token}`)
      .send({ category_code: 'not_a_real_category' });

    expect(res.status).toBe(400);
  });
});
