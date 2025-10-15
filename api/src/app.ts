import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRouter from './routes/auth';
import eventsRouter from './routes/events';
import subCompetitionsRouter from './routes/subcompetitions';
import betsRouter from './routes/bets';
import resultsRouter from './routes/results';
import settlementsRouter from './routes/settlements';
import statsRouter from './routes/stats';
import achievementsRouter from './routes/achievements';
import invitesRouter from './routes/invites';
import membershipsRouter from './routes/memberships';
import notificationsRouter from './routes/notifications';
import walletRouter from './routes/wallet';
import adminAuditRouter from './routes/admin/audit';
import adminUsersRouter from './routes/admin/users';
import adminHouseRouter from './routes/admin/house';
import { env } from './config/env';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

const allowedOrigins = env.CORS_ORIGIN.length > 0 ? env.CORS_ORIGIN : undefined;

const app = express();

app.use(helmet());
app.use(express.json());
app.use(
  cors({
    origin: allowedOrigins ?? true,
    credentials: true,
  }),
);
app.use(limiter);

app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRouter);
app.use('/events', eventsRouter);
app.use('/subcompetitions', subCompetitionsRouter);
app.use('/bets', betsRouter);
app.use('/results', resultsRouter);
app.use('/settlements', settlementsRouter);
app.use('/stats', statsRouter);
app.use('/achievements', achievementsRouter);
app.use(invitesRouter);
app.use(membershipsRouter);
app.use(notificationsRouter);
app.use('/wallet', walletRouter);
app.use('/admin/audit', adminAuditRouter);
app.use('/admin/users', adminUsersRouter);
app.use('/admin/house', adminHouseRouter);

export { app };
