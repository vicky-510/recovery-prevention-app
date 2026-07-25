import rateLimit from 'express-rate-limit';

// Limits are a production concern; enforcing them would make tests order-dependent.
const skip = () => process.env.NODE_ENV === 'test';

/** Tight limit on credential endpoints to blunt brute-force attempts. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip,
  message: { error: 'Too many attempts. Please wait a few minutes.' },
});

/**
 * Deliberately generous: this endpoint is reached by someone in crisis, so the
 * limit exists to cap AI spend on a runaway client, not to police real users.
 */
export const interventionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip,
  message: { error: 'Too many requests. Please wait a moment.' },
});
