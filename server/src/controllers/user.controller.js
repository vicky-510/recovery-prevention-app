import * as userService from '../services/user.service.js';

const PHONE_PATTERN = /^[+()\d][\d\s()+-]{4,24}$/;
const MAX_NAME_LENGTH = 80;

export async function me(req, res, next) {
  try {
    const profile = await userService.getProfile(req.userId);
    if (!profile) return res.status(401).json({ error: 'Unauthorized' });

    res.json(profile);
  } catch (err) {
    next(err);
  }
}

export async function updateSafeContact(req, res, next) {
  try {
    const { name, phone } = req.body ?? {};

    // Both empty clears the contact.
    if (!name && !phone) {
      return res.json(await userService.setSafeContact(req.userId, null, null));
    }

    if (!name || !phone) {
      return res.status(400).json({ error: 'A name and a phone number are both required.' });
    }
    if (typeof name !== 'string' || name.trim().length === 0 || name.length > MAX_NAME_LENGTH) {
      return res.status(400).json({ error: `Name must be 1-${MAX_NAME_LENGTH} characters.` });
    }
    if (typeof phone !== 'string' || !PHONE_PATTERN.test(phone.trim())) {
      return res.status(400).json({ error: 'That does not look like a phone number.' });
    }

    res.json(await userService.setSafeContact(req.userId, name.trim(), phone.trim()));
  } catch (err) {
    next(err);
  }
}
