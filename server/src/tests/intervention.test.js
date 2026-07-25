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
    // Ordered deliberately: a distressed reader should meet the most likely
    // reason they opened the app first, not whatever sorts first.
    expect(res.body.map((c) => c.code)).toEqual([
      'craving',
      'panic',
      'post_relapse',
      'caregiver_checkin',
    ]);
    expect(res.body.every((c) => typeof c.label === 'string' && c.label.length > 0)).toBe(true);
  });
});

describe('POST /api/interventions/voice validation', () => {
  // These reject before reaching Gemini, so they cost no API quota.
  const wav = Buffer.alloc(2048).toString('base64');

  it('rejects a request without a token', async () => {
    expect((await request(app).post('/api/interventions/voice')).status).toBe(401);
  });

  it('rejects a missing recording with 400', async () => {
    const res = await request(app)
      .post('/api/interventions/voice')
      .set('Authorization', `Bearer ${token}`)
      .send({ mime_type: 'audio/wav' });

    expect(res.status).toBe(400);
  });

  it.each(['application/pdf', 'text/plain', 'image/png', '', undefined])(
    'rejects the non-audio type %s with 400',
    async (mimeType) => {
      const res = await request(app)
        .post('/api/interventions/voice')
        .set('Authorization', `Bearer ${token}`)
        .send({ audio_base64: wav, mime_type: mimeType });

      expect(res.status).toBe(400);
    }
  );

  it('accepts a codec suffix on the media type', async () => {
    const res = await request(app)
      .post('/api/interventions/voice')
      .set('Authorization', `Bearer ${token}`)
      .send({ audio_base64: wav, mime_type: 'audio/webm;codecs=opus', local_hour: 'noon' });

    // Rejected for the bad hour, proving the media type itself passed.
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/local_hour/);
  });

  it('rejects a recording that is too large with 413', async () => {
    const res = await request(app)
      .post('/api/interventions/voice')
      .set('Authorization', `Bearer ${token}`)
      .send({ audio_base64: 'A'.repeat(4 * 1024 * 1024 + 1), mime_type: 'audio/wav' });

    expect(res.status).toBe(413);
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
