# Wineify API Quickstart

## Database migrations

```bash
npm install
npx prisma migrate dev --name add_stats_model
```

## Stats endpoints

- `GET /api/stats/leaderboard` — returns the top 20 users ordered by XP.
- `GET /api/stats/:userId` — returns the aggregated statistics for a specific user.
- `POST /api/settlements/:id/mark-received` — finalises a settlement, updates XP/record streaks and responds with the refreshed user snapshot.

XP progression uses the formula `xp += 10 * sqrt(payoutUnits)`.

## Running the service

```bash
npm run dev
```

The server listens on `http://localhost:3000/api`.
