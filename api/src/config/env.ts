import { config as loadEnv } from 'dotenv';

loadEnv();

const WEAK_SECRETS = new Set([
  'your_secret_key',
  'changeme',
  'changemeplease',
  'secret',
]);

const MIN_SECRET_BYTES = 32;

const rawJwtSecret = process.env.JWT_SECRET;

const isWeakSecret = (secret: string | undefined): boolean => {
  if (!secret) {
    return true;
  }

  if (WEAK_SECRETS.has(secret)) {
    return true;
  }

  return Buffer.byteLength(secret, 'utf8') < MIN_SECRET_BYTES;
};

if (!rawJwtSecret) {
  throw new Error('JWT_SECRET environment variable is required.');
}

if (isWeakSecret(rawJwtSecret)) {
  throw new Error('JWT_SECRET must be at least 32 bytes and not a default placeholder.');
}

const parseCorsOrigins = (value: string | undefined): string[] =>
  value
    ?.split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0) ?? [];

export const env = Object.freeze({
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  JWT_SECRET: rawJwtSecret,
  CORS_ORIGIN: parseCorsOrigins(process.env.CORS_ORIGIN),
});

export type Env = typeof env;
