import { randomBytes, randomInt } from 'crypto';

const DEFAULT_JOIN_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const secureJoinCode = (length: number, alphabet = DEFAULT_JOIN_CODE_ALPHABET): string => {
  if (!Number.isInteger(length) || length <= 0) {
    throw new Error('Join code length must be a positive integer.');
  }

  if (alphabet.length === 0) {
    throw new Error('Alphabet must contain at least one character.');
  }

  let code = '';
  for (let index = 0; index < length; index += 1) {
    const charIndex = randomInt(0, alphabet.length);
    code += alphabet[charIndex];
  }

  return code;
};

export const secureId = (bytes = 16): string => {
  if (!Number.isInteger(bytes) || bytes <= 0) {
    throw new Error('ID byte length must be a positive integer.');
  }

  return randomBytes(bytes).toString('hex');
};
