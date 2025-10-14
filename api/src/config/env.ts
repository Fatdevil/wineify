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

const DURATION_PATTERN = /^(\d+)([smhd])$/i;
const UNIT_TO_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 60 * 60,
  d: 60 * 60 * 24,
};

const parseDuration = (value: string | undefined, fallback: string, label: string) => {
  const raw = value ?? fallback;
  const match = raw.match(DURATION_PATTERN);

  if (!match) {
    throw new Error(`${label} must be a duration string such as 15m, 1h, or 30d.`);
  }

  const amount = Number.parseInt(match[1] ?? '0', 10);
  const unit = (match[2] ?? 's').toLowerCase();
  const multiplier = UNIT_TO_SECONDS[unit];

  if (!Number.isFinite(amount) || amount <= 0 || !multiplier) {
    throw new Error(`${label} must be a positive duration.`);
  }

  const seconds = amount * multiplier;

  return {
    raw,
    seconds,
    milliseconds: seconds * 1000,
  } as const;
};

const parseInteger = (value: string | undefined, fallback: number, label: string) => {
  const parsed = Number.parseInt(value ?? `${fallback}`, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }

  return parsed;
};

export const env = Object.freeze({
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  JWT_SECRET: rawJwtSecret,
  CORS_ORIGIN: parseCorsOrigins(process.env.CORS_ORIGIN),
  JWT_ACCESS_TTL: parseDuration(process.env.JWT_ACCESS_TTL, '15m', 'JWT_ACCESS_TTL'),
  JWT_REFRESH_TTL: parseDuration(process.env.JWT_REFRESH_TTL, '30d', 'JWT_REFRESH_TTL'),
  BCRYPT_ROUNDS: parseInteger(process.env.BCRYPT_ROUNDS, 12, 'BCRYPT_ROUNDS'),
});

export type Env = typeof env;
