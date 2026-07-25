import 'dotenv/config';

const REQUIRED = ['DATABASE_URL', 'GEMINI_API_KEY', 'HMAC_SECRET'];

const missing = REQUIRED.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(', ')}. See server/.env.example.`
  );
}

export const env = {
  DATABASE_URL: process.env.DATABASE_URL,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  HMAC_SECRET: process.env.HMAC_SECRET,
  PORT: Number(process.env.PORT) || 3000,
};
