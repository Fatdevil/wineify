import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['user', 'admin']).default('user'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
