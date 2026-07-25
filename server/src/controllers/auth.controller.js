import * as authService from '../services/auth.service.js';

const ROLES = ['person', 'caregiver'];
const MIN_PASSWORD_LENGTH = 8;

export async function signup(req, res, next) {
  try {
    const { email, password, role } = req.body ?? {};

    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Email, password, and role are required.' });
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return res
        .status(400)
        .json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
    }
    if (!ROLES.includes(role)) {
      return res.status(400).json({ error: `Role must be one of: ${ROLES.join(', ')}.` });
    }

    res.status(201).json(await authService.signup(email, password, role));
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'That email is already registered.' });
    }
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const result = await authService.login(email, password);
    if (!result) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
}
