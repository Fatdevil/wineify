# Friends Betting App

A minimal mobile-first dashboard for tracking friendly wagers, built with React, Vite, TailwindCSS and React Query. The UI consumes the Wineify betting API to surface event listings, personal betting activity, results and settlement obligations.

## Getting Started

```bash
npm install
npm run dev
```

The development server assumes the backend is available at `http://localhost:3000/api` and that a JWT token is stored in `localStorage` under the key `jwt`.

## Using the Results & Settlements Dashboard

1. **Events** – browse current and recently closed events. Each card shows pool totals, descriptions and close dates with status badges so you can jump into the action quickly.
2. **My Bets** – review all of your wagers with outcome, odds, stake and projected payout. Status badges (WIN/LOSS/REFUND) make it clear how each bet finished.
3. **Results** – open the Results tab to view payout summaries for a specific event. Totals include both gross payouts and your net unit position, while each settled competition displays the winning outcome and per-unit return.
4. **Settlements** – stay on top of outstanding obligations. Pending settlements can be marked as received, triggering an optimistic update in the UI and a `POST /settlements/:id/mark-received` request to the backend for persistence.

All screens are designed mobile-first with TailwindCSS in a dark theme to match late-night score checking.

## Testing

```bash
npm run test
```

Vitest and Testing Library validate API integration for each component and ensure optimistic settlement updates behave as expected.
