import crypto from 'node:crypto';
import request from 'supertest';
import { app } from '../app.js';
import { pool } from '../db/pool.js';
import { verifyToken } from '../utils/token.js';

const password = 'CorrectHorse9!';
const emails = [];

/** Unique per run so the suite is safe to re-run against the real database. */
function freshEmail() {
  const email = `test-${crypto.randomUUID()}@example.test`;
  emails.push(email);
  return email;
}

afterAll(async () => {
  await pool.query('DELETE FROM users WHERE email = ANY($1)', [emails]);
  await pool.end();
});

describe('POST /api/auth/signup', () => {
  it('creates a user and returns a valid token', async () => {
    const email = freshEmail();

    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email, password, role: 'person' });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email, role: 'person' });
    expect(verifyToken(res.body.token)).toBe(res.body.user.id);
  });

  it('never returns the password hash', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: freshEmail(), password, role: 'caregiver' });

    expect(JSON.stringify(res.body)).not.toContain('password');
  });

  it('stores the password hashed, not in plain text', async () => {
    const email = freshEmail();
    await request(app).post('/api/auth/signup').send({ email, password, role: 'person' });

    const { rows } = await pool.query('SELECT password_hash FROM users WHERE email = $1', [email]);

    expect(rows[0].password_hash).not.toBe(password);
    expect(rows[0].password_hash).toMatch(/^\$2[aby]\$/);
  });

  it('rejects a duplicate email with 409', async () => {
    const email = freshEmail();
    const body = { email, password, role: 'person' };

    await request(app).post('/api/auth/signup').send(body);
    const res = await request(app).post('/api/auth/signup').send(body);

    expect(res.status).toBe(409);
  });

  it.each([
    ['a missing password', { email: 'a@example.test', role: 'person' }],
    ['a short password', { email: 'b@example.test', password: 'short', role: 'person' }],
    ['an unknown role', { email: 'c@example.test', password, role: 'admin' }],
    ['an empty body', {}],
  ])('rejects %s with 400', async (_label, body) => {
    const res = await request(app).post('/api/auth/signup').send(body);
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('returns a token for correct credentials', async () => {
    const email = freshEmail();
    await request(app).post('/api/auth/signup').send({ email, password, role: 'person' });

    const res = await request(app).post('/api/auth/login').send({ email, password });

    expect(res.status).toBe(200);
    expect(verifyToken(res.body.token)).toBe(res.body.user.id);
  });

  it('rejects a wrong password with 401', async () => {
    const email = freshEmail();
    await request(app).post('/api/auth/signup').send({ email, password, role: 'person' });

    const res = await request(app).post('/api/auth/login').send({ email, password: 'WrongPass9!' });

    expect(res.status).toBe(401);
  });

  it('rejects an unknown email with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.test', password });

    expect(res.status).toBe(401);
  });

  it('gives the same message for a wrong password and an unknown email', async () => {
    const email = freshEmail();
    await request(app).post('/api/auth/signup').send({ email, password, role: 'person' });

    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'WrongPass9!' });
    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.test', password });

    // Differing messages would let an attacker enumerate registered accounts.
    expect(wrongPassword.body.error).toBe(unknownEmail.body.error);
  });
});
