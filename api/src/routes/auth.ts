import { Router, type Request } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { validateBody } from '../middleware/validate';
import { rateLimitAccount } from '../middleware/rateLimitAccount';
import { audit } from '../middleware/audit';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
  type RegisterInput,
  type LoginInput,
  type RefreshInput,
  type LogoutInput,
} from '../modules/auth/schemas';
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  mintRefreshToken,
  rotateRefreshToken,
  verifyRefreshToken,
  revokeSession,
  revokeAll,
} from '../services/auth.service';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

const userAgentFrom = (req: Request) => req.get('user-agent') ?? undefined;

const sessionContext = (req: Request) => ({
  prisma,
  userAgent: userAgentFrom(req),
  ip: req.ip,
});

const serializeUser = (user: { id: string; email: string; role: Role; createdAt: Date; isBanned: boolean }) => ({
  id: user.id,
  email: user.email,
  role: user.role,
  isBanned: user.isBanned,
  createdAt: user.createdAt,
});

router.post('/register', validateBody(registerSchema), async (req, res) => {
  const { email, password } = req.body as RegisterInput;

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    return res.status(409).json({ message: 'Email is already registered.' });
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: Role.USER,
    },
  });

  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const { refreshToken } = await mintRefreshToken(user.id, sessionContext(req));

  return res.status(201).json({
    user: serializeUser(user),
    accessToken,
    refreshToken,
  });
});

router.post('/login', validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.body as LoginInput;

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  const isValid = await verifyPassword(password, user.passwordHash);

  if (!isValid) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  if (user.isBanned) {
    return res.status(403).json({ message: 'Account is disabled.' });
  }

  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const { refreshToken } = await mintRefreshToken(user.id, sessionContext(req));

  return res.status(200).json({
    user: serializeUser(user),
    accessToken,
    refreshToken,
  });
});

router.post('/refresh', validateBody(refreshSchema), async (req, res) => {
  const { refreshToken } = req.body as RefreshInput;

  try {
    const session = await verifyRefreshToken(refreshToken, undefined, { prisma });
    const user = await prisma.user.findUnique({ where: { id: session.userId } });

    if (!user) {
      await revokeSession(session.id, { prisma });
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.isBanned) {
      return res.status(403).json({ message: 'Account is disabled.' });
    }

    const rotated = await rotateRefreshToken(refreshToken, user.id, sessionContext(req));
    const accessToken = signAccessToken({ sub: user.id, role: user.role });

    return res.status(200).json({
      user: serializeUser(user),
      accessToken,
      refreshToken: rotated.refreshToken,
    });
  } catch (error) {
    return res.status(401).json({ message: 'Refresh token is invalid or expired.' });
  }
});

router.post('/logout', requireAuth, rateLimitAccount, audit, validateBody(logoutSchema), async (req, res) => {
  const { all, refreshToken } = req.body as LogoutInput;
  const user = req.user!;

  if (all) {
    await revokeAll(user.id, { prisma });
    res.locals.audit = {
      eventType: 'auth:logout-all',
      targetId: user.id,
    };
    return res.status(200).json({ ok: true });
  }

  try {
    const session = await verifyRefreshToken(refreshToken!, user.id, { prisma });
    await revokeSession(session.id, { prisma });

    res.locals.audit = {
      eventType: 'auth:logout',
      targetId: user.id,
      meta: {
        sessionId: session.id,
      },
    };

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(400).json({ message: 'Unable to revoke session.' });
  }
});

router.get('/me', requireAuth, rateLimitAccount, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      email: true,
        role: true,
        isBanned: true,
        createdAt: true,
      },
  });

  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  return res.status(200).json({
    user,
  });
});

export default router;
