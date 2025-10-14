import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/requireAuth';
import { requireEventAdmin } from '../middleware/requireEventMember';
import { createInvite, joinWithInvite, revokeInvite } from '../services/invites.service';

const router = Router();

const createInviteSchema = z
  .object({
    expiresAt: z
      .string()
      .datetime({ message: 'expiresAt must be an ISO 8601 datetime string.' })
      .transform((value) => new Date(value))
      .optional(),
    maxUses: z
      .number({ coerce: true })
      .int({ message: 'maxUses must be an integer.' })
      .positive({ message: 'maxUses must be greater than zero.' })
      .optional(),
  })
  .strict();

const joinSchema = z
  .object({
    inviteCode: z
      .string()
      .min(12, 'Invite codes must be at least 12 characters long.')
      .regex(/^[A-Za-z0-9_-]+$/, 'Invite codes must be URL-safe.'),
  })
  .strict();

router.use(requireAuth);

router.post('/events/:eventId/invites', requireEventAdmin((req) => req.params.eventId ?? null), async (req, res) => {
  const parseResult = createInviteSchema.safeParse(req.body ?? {});

  if (!parseResult.success) {
    return res.status(400).json({
      ok: false,
      errors: parseResult.error.issues.map((issue) => ({
        path: issue.path.join('.') || undefined,
        message: issue.message,
      })),
    });
  }

  try {
    const eventId = req.params.eventId as string;
    const { inviteId, inviteCode } = await createInvite(eventId, req.user!.id, parseResult.data);

    return res.status(201).json({ ok: true, inviteId, inviteCode });
  } catch (error) {
    const status = (error as any)?.statusCode ?? 500;
    const message = error instanceof Error ? error.message : 'Unable to create invite.';

    return res.status(status).json({ ok: false, message });
  }
});

router.post('/invites/join', async (req, res) => {
  const parseResult = joinSchema.safeParse(req.body ?? {});

  if (!parseResult.success) {
    return res.status(400).json({
      ok: false,
      errors: parseResult.error.issues.map((issue) => ({
        path: issue.path.join('.') || undefined,
        message: issue.message,
      })),
    });
  }

  try {
    const membership = await joinWithInvite(parseResult.data.inviteCode, req.user!.id);

    return res.status(200).json({ ok: true, membership });
  } catch (error) {
    const status = (error as any)?.statusCode ?? 400;
    const message = error instanceof Error ? error.message : 'Unable to join using invite.';

    return res.status(status).json({ ok: false, message });
  }
});

router.post('/invites/:id/revoke', async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ ok: false, message: 'Invite identifier is required.' });
  }

  try {
    const invite = await revokeInvite(id, req.user!.id);

    return res.status(200).json({ ok: true, invite });
  } catch (error) {
    const status = (error as any)?.statusCode ?? 400;
    const message = error instanceof Error ? error.message : 'Unable to revoke invite.';

    return res.status(status).json({ ok: false, message });
  }
});

export default router;
