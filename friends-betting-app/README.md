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
3. Capture the full dashboard showing the Event List, My Bets, Results summary, Settlements cards, Leaderboard, Achievements grid and Profile panels so the new XP indicators are visible.

## Achievements

- A dedicated **Achievements** section highlights every badge available in the Wineify ecosystem alongside XP rewards.
- Unlocked achievements glow at full opacity and surface the unlock date so it is easy to share milestones.
- Locked entries remain visible (dimmed) to tease the next targets for returning players.
- Profile stats now show the current level, total XP and the next level target using the new progression formula.
- To capture updated visuals, follow the screenshot steps above and include the Achievements grid and Profile panels in the frame.

## API expectations

The dashboard expects the Wineify backend to be available at `http://localhost:3000/api`. A short-lived access token is held in memory, while the refresh token is persisted in `localStorage` under the key `wineify.refreshToken` so the session can be restored on reload.

### Joining a private event

1. Ask an event admin for an invite code generated from `/events/:eventId/invites`.
2. Open the dashboard, authenticate, and use the **Join via invite code** input on the events view.
3. Paste the code and submit — once accepted, the event cards unlock immediately and show your current role in the event header.

### Staying informed

- A bell icon appears in the top right once you are signed in. The badge shows unread notifications and the panel polls the API every 20 seconds.
- Posting results, generating settlements, or marking obligations received will surface notifications to relevant members.
- Click any unread notification to mark it as read and collapse your badge count.

## Project structure

```
friends-betting-app/
├── index.html           # Application shell
├── scripts/
│   └── dev-server.mjs   # Lightweight static file server for local dev
├── src/
│   ├── api.js           # Fetch helpers for the Wineify API
│   ├── app.js           # Dashboard logic & rendering
│   ├── AchievementsView.js # Renders the achievements grid & locked states
│   ├── helpers.js       # Formatting utilities (unit tested)
│   ├── Leaderboard.js   # Leaderboard renderer & XP bars
│   ├── ProfileStats.js  # Profile summary with streak and XP progress
│   └── styles.css       # Tailored styling (dark mode)
└── tests/
    └── helpers.test.mjs # Node test exercising formatting helpers
```

