import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/requireAuth';
import { rateLimitAccount } from '../middleware/rateLimitAccount';
import { audit } from '../middleware/audit';
import { listNotifications, markNotificationRead } from '../services/notify.service';

const router = Router();

const listSchema = z
  .object({
    limit: z
      .string()
      .optional()
      .transform((value) => (value ? Number.parseInt(value, 10) : undefined))
      .refine((value) => value === undefined || (Number.isInteger(value) && value > 0 && value <= 100), {
        message: 'limit must be an integer between 1 and 100.',
      }),
    afterId: z.string().optional(),
  })
  .strict();

router.use(requireAuth);
router.use(rateLimitAccount);
router.use(audit);

router.get('/notifications', async (req, res) => {
  const parseResult = listSchema.safeParse(req.query ?? {});

  if (!parseResult.success) {
    return res.status(400).json({
      ok: false,
      errors: parseResult.error.issues.map((issue) => ({
        path: issue.path.join('.') || undefined,
        message: issue.message,
      })),
    });
  }

  const notifications = await listNotifications(req.user!.id, {
    limit: parseResult.data.limit,
    afterId: parseResult.data.afterId,
  });

  return res.status(200).json({ ok: true, notifications });
});

router.post('/notifications/:id/read', async (req, res) => {
  try {
    const notification = await markNotificationRead(req.params.id, req.user!.id);

    res.locals.audit = {
      eventType: 'notifications:mark-read',
      targetId: req.params.id,
    };

    return res.status(200).json({ ok: true, notification });
  } catch (error) {
    const status = (error as any)?.statusCode ?? 400;
    const message = error instanceof Error ? error.message : 'Unable to mark notification as read.';

    return res.status(status).json({ ok: false, message });
  }
});

export default router;
