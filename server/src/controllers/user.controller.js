import * as userService from '../services/user.service.js';

const PHONE_PATTERN = /^[+()\d][\d\s()+-]{4,24}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_NAME_LENGTH = 40;

function blankToNull(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

export async function me(req, res, next) {
  try {
    const profile = await userService.getProfile(req.userId);
    if (!profile) return res.status(401).json({ error: 'Unauthorized' });

    res.json(profile);
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const body = req.body ?? {};

    const firstName = blankToNull(body.first_name);
    const sobrietyStartDate = blankToNull(body.sobriety_start_date);
    const safeContactName = blankToNull(body.safe_contact_name);
    const safeContactPhone = blankToNull(body.safe_contact_phone);

    if (firstName && firstName.length > MAX_NAME_LENGTH) {
      return res.status(400).json({ error: `Name must be ${MAX_NAME_LENGTH} characters or fewer.` });
    }
    if (safeContactName && safeContactName.length > MAX_NAME_LENGTH) {
      return res
        .status(400)
        .json({ error: `Contact name must be ${MAX_NAME_LENGTH} characters or fewer.` });
    }

    if (sobrietyStartDate) {
      if (!DATE_PATTERN.test(sobrietyStartDate)) {
        return res.status(400).json({ error: 'Date must be in YYYY-MM-DD format.' });
      }
      const parsed = new Date(`${sobrietyStartDate}T00:00:00Z`);
      if (Number.isNaN(parsed.getTime())) {
        return res.status(400).json({ error: 'That is not a real date.' });
      }
      if (parsed.getTime() > Date.now()) {
        return res.status(400).json({ error: 'That date is in the future.' });
      }
    }

    // A contact is only useful if it can actually be dialled.
    if (safeContactName || safeContactPhone) {
      if (!safeContactName || !safeContactPhone) {
        return res
          .status(400)
          .json({ error: 'A contact needs both a name and a phone number.' });
      }
      if (!PHONE_PATTERN.test(safeContactPhone)) {
        return res.status(400).json({ error: 'That does not look like a phone number.' });
      }
    }

    res.json(
      await userService.updateProfile(req.userId, {
        firstName,
        sobrietyStartDate,
        safeContactName,
        safeContactPhone,
      })
    );
  } catch (err) {
    next(err);
  }
}
