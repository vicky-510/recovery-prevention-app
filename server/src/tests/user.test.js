import crypto from 'node:crypto';
import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db/pool.js';

const password = 'CorrectHorse9!';
const emails = [];

function freshEmail() {
  const email = `test-${crypto.randomUUID()}@example.test`;
  emails.push(email);
  return email;
}

async function signUp(role = 'person') {
  const email = freshEmail();
  const res = await request(app).post('/api/auth/signup').send({ email, password, role });
  return { email, token: res.body.token, auth: { Authorization: `Bearer ${res.body.token}` } };
}

let user;

beforeAll(async () => {
  user = await signUp();
});

afterAll(async () => {
  await pool.query('DELETE FROM users WHERE email = ANY($1)', [emails]);
  await pool.end();
});

describe('GET /api/me', () => {
  it('requires a token', async () => {
    expect((await request(app).get('/api/me')).status).toBe(401);
  });

  it('returns the profile without the password hash', async () => {
    const res = await request(app).get('/api/me').set(user.auth);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ email: user.email, role: 'person' });
    expect(res.body.password_hash).toBeUndefined();
  });
});

describe('PUT /api/me', () => {
  it('requires a token', async () => {
    expect((await request(app).put('/api/me')).status).toBe(401);
  });

  it('saves every field and reads it back', async () => {
    const res = await request(app).put('/api/me').set(user.auth).send({
      first_name: 'John',
      sobriety_start_date: '2026-07-07',
      safe_contact_name: 'Rahul',
      safe_contact_phone: '+91 98765 43210',
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      first_name: 'John',
      safe_contact_name: 'Rahul',
      safe_contact_phone: '+91 98765 43210',
    });

    const profile = await request(app).get('/api/me').set(user.auth);
    expect(profile.body.first_name).toBe('John');
  });

  it('computes days sober from the recorded date', async () => {
    const twenty = new Date();
    twenty.setUTCDate(twenty.getUTCDate() - 20);

    const res = await request(app)
      .put('/api/me')
      .set(user.auth)
      .send({ sobriety_start_date: twenty.toISOString().slice(0, 10) });

    expect(res.body.days_sober).toBe(20);
  });

  it('reports no streak when no date is recorded', async () => {
    const res = await request(app).put('/api/me').set(user.auth).send({});
    expect(res.body.days_sober).toBeNull();
  });

  it('trims surrounding whitespace', async () => {
    const res = await request(app)
      .put('/api/me')
      .set(user.auth)
      .send({ first_name: '  John  ', safe_contact_name: ' Rahul ', safe_contact_phone: ' 07700900123 ' });

    expect(res.body.first_name).toBe('John');
    expect(res.body.safe_contact_phone).toBe('07700900123');
  });

  it('clears fields when they are sent empty', async () => {
    await request(app)
      .put('/api/me')
      .set(user.auth)
      .send({ first_name: 'John', safe_contact_name: 'Rahul', safe_contact_phone: '07700900123' });

    const res = await request(app).put('/api/me').set(user.auth).send({});

    expect(res.body.first_name).toBeNull();
    expect(res.body.safe_contact_name).toBeNull();
    expect(res.body.safe_contact_phone).toBeNull();
  });

  it.each([
    ['a contact name with no phone', { safe_contact_name: 'Rahul' }],
    ['a phone with no contact name', { safe_contact_phone: '07700900123' }],
    ['a phone that is not a number', { safe_contact_name: 'R', safe_contact_phone: 'call me' }],
    ['a first name that is too long', { first_name: 'a'.repeat(41) }],
    ['a malformed date', { sobriety_start_date: '07-07-2026' }],
    ['an impossible date', { sobriety_start_date: '2026-13-45' }],
    ['a date in the future', { sobriety_start_date: '2099-01-01' }],
  ])('rejects %s with 400', async (_label, body) => {
    expect((await request(app).put('/api/me').set(user.auth).send(body)).status).toBe(400);
  });

  it('keeps one account\'s details out of another\'s', async () => {
    const other = await signUp();
    await request(app).put('/api/me').set(user.auth).send({ first_name: 'John' });

    const res = await request(app).get('/api/me').set(other.auth);

    expect(res.body.first_name).toBeNull();
    expect(res.body.email).toBe(other.email);
  });
});

describe('GET /api/education/:categoryCode', () => {
  it('requires a token', async () => {
    expect((await request(app).get('/api/education/craving')).status).toBe(401);
  });

  it('returns 404 for an unknown category before calling the model', async () => {
    const res = await request(app).get('/api/education/meteor_strike').set(user.auth);
    expect(res.status).toBe(404);
  });
});
