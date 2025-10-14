import { z } from 'zod';

const emailSchema = z
  .string()
  .email()
  .transform((value) => value.trim().toLowerCase());

const passwordSchema = z.string().min(8);

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
  })
  .strict();

export const loginSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
  })
  .strict();

export const refreshSchema = z
  .object({
    refreshToken: z.string().min(10),
  })
  .strict();

export const logoutSchema = z
  .object({
    all: z.boolean().optional(),
    refreshToken: z.string().min(10).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.all && !data.refreshToken) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'refreshToken is required unless logging out from all sessions.',
        path: ['refreshToken'],
      });
    }
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
