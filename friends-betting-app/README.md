# Friends Betting Dashboard

A lightweight dashboard that visualises friends betting activity against the Wineify API. The UI is built with vanilla JavaScript and modern browser APIs so it can run without downloading npm packages — ideal for constrained or proxied environments.

## Quickstart

1. Install dependencies (none required, but this command creates `package-lock.json`):
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
   The dashboard is served on [http://localhost:5173](http://localhost:5173).
3. Run the automated checks:
   ```bash
   npm test
   ```

## Taking a screenshot preview

1. Run `npm run dev`.
2. Open [http://localhost:5173](http://localhost:5173) in your browser.
3. Capture the full dashboard showing the Event List, My Bets, Results summary, Settlements cards, Leaderboard and Profile panels so the new XP indicators are visible.

## API expectations

The dashboard expects the Wineify backend to be available at `http://localhost:3000/api`. Authentication tokens stored in `localStorage` under the key `jwt` are automatically attached to requests.

## Project structure

```
friends-betting-app/
├── index.html           # Application shell
├── scripts/
│   └── dev-server.mjs   # Lightweight static file server for local dev
├── src/
│   ├── api.js           # Fetch helpers for the Wineify API
│   ├── app.js           # Dashboard logic & rendering
│   ├── helpers.js       # Formatting utilities (unit tested)
│   ├── Leaderboard.js   # Leaderboard renderer & XP bars
│   ├── ProfileStats.js  # Profile summary with streak and XP progress
│   └── styles.css       # Tailored styling (dark mode)
└── tests/
    └── helpers.test.mjs # Node test exercising formatting helpers
```

