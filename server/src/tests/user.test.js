import crypto from 'node:crypto';
import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db/pool.js';

const email = `test-${crypto.randomUUID()}@example.test`;
const password = 'CorrectHorse9!';
let token;

const auth = () => ({ Authorization: `Bearer ${token}` });

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

describe('GET /api/me', () => {
  it('requires a token', async () => {
    expect((await request(app).get('/api/me')).status).toBe(401);
  });

  it('returns the profile without the password hash', async () => {
    const res = await request(app).get('/api/me').set(auth());

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ email, role: 'person' });
    expect(res.body.password_hash).toBeUndefined();
  });
});

describe('PUT /api/me/safe-contact', () => {
  it('requires a token', async () => {
    expect((await request(app).put('/api/me/safe-contact')).status).toBe(401);
  });

  it('saves a contact and returns it on the profile', async () => {
    const res = await request(app)
      .put('/api/me/safe-contact')
      .set(auth())
      .send({ name: 'Sam', phone: '+44 7700 900123' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      safe_contact_name: 'Sam',
      safe_contact_phone: '+44 7700 900123',
    });

    const profile = await request(app).get('/api/me').set(auth());
    expect(profile.body.safe_contact_name).toBe('Sam');
  });

  it('trims surrounding whitespace', async () => {
    const res = await request(app)
      .put('/api/me/safe-contact')
      .set(auth())
      .send({ name: '  Sam  ', phone: '  07700900123  ' });

    expect(res.body.safe_contact_name).toBe('Sam');
    expect(res.body.safe_contact_phone).toBe('07700900123');
  });

  it.each([
    ['a name with no phone', { name: 'Sam' }],
    ['a phone with no name', { phone: '07700900123' }],
    ['a phone that is not a number', { name: 'Sam', phone: 'call me maybe' }],
    ['a phone that is too short', { name: 'Sam', phone: '123' }],
  ])('rejects %s with 400', async (_label, body) => {
    expect((await request(app).put('/api/me/safe-contact').set(auth()).send(body)).status).toBe(400);
  });

  it('clears the contact when both fields are empty', async () => {
    await request(app).put('/api/me/safe-contact').set(auth()).send({ name: 'Sam', phone: '07700900123' });

    const res = await request(app).put('/api/me/safe-contact').set(auth()).send({});

    expect(res.status).toBe(200);
    expect(res.body.safe_contact_name).toBeNull();
    expect(res.body.safe_contact_phone).toBeNull();
  });
});

describe('GET /api/education/:categoryCode', () => {
  it('requires a token', async () => {
    expect((await request(app).get('/api/education/craving')).status).toBe(401);
  });

  it('returns 404 for an unknown category before calling the model', async () => {
    const res = await request(app).get('/api/education/meteor_strike').set(auth());
    expect(res.status).toBe(404);
  });
});
