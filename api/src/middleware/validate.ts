import type { RequestHandler } from 'express';
import type { ZodIssue, ZodTypeAny } from 'zod';

export type ZodSchema = ZodTypeAny;

export const validateBody = (schema: ZodSchema): RequestHandler => {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.issues.map((issue: ZodIssue) => ({
        path: issue.path.join('.') || undefined,
        message: issue.message,
        code: issue.code,
      }));

      return res.status(400).json({
        errors,
      });
    }

    req.body = result.data;
    return next();
  };
};
