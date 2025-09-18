import express from 'express';
import { json } from 'body-parser';
import { connectDatabase } from './config';
import authRoutes from './auth';
import userRoutes from './users';
import eventRoutes from './events';
import participantRoutes from './participants';
import betRoutes from './bets';
import poolRoutes from './pools';
import payoutRoutes from './payouts';
import ledgerRoutes from './ledger';
import joinCodeRoutes from './join-codes';
import summaryRoutes from './summaries';
import notificationRoutes from './notifications';
import auditRoutes from './audit';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(json());

// Connect to the database
connectDatabase();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/participants', participantRoutes);
app.use('/api/bets', betRoutes);
app.use('/api/pools', poolRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/join-codes', joinCodeRoutes);
app.use('/api/summaries', summaryRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit', auditRoutes);

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});