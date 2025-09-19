import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRouter from './routes/auth';
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

export { app };
