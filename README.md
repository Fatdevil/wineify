# Wineify — Friends Betting (Pari-Mutuel)

Wineify är en vän-bettingplattform med pari-mutuel-odds: alla insatser går i en pott, huset tar ev. house cut, och vinster betalas ut proportionellt från nettopotten. Appen stödjer events, sub-tävlingar, deltagare, bets, live-odds, resultat, utbetalningar och settlements.

## Snabbstart (API lokalt)
```bash
cd api
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev

```


Öppna http://localhost:3000/health.

Full guide: se api/quickstart.md
.

Miljövariabler

Se api/.env.example. Minst:

DATABASE_URL (ex. file:./dev.db för dev eller Postgres-URL i prod)

JWT_SECRET

NODE_ENV, PORT, CORS_ORIGIN

Arkitektur (kort)

API: Node.js + TypeScript (Express), Prisma ORM

DB: SQLite för dev / PostgreSQL i staging/production

Domän: Auth, Events, Sub-Competitions, Participants, Bets, Pools/Odds, Results, Settlements, Notifications, Exports

Säkerhet: JWT, Helmet, CORS, rate limiting, audit

Drift: valfri PaaS (Railway/Fly/Render) + hanterad Postgres. Cron/worker för auto-close rekommenderas.

Scripts (i api/)

npm run dev | build | start | test

npx prisma generate | migrate dev | migrate deploy | studio

CI

Se .github/workflows/ci.yml
 – kör build/test och prisma migrate i GitHub Actions.

Mappar
api/                 # Backend (Express/Prisma)
specs/               # Spec/plan/tasks/kontrakt
friends-betting-app/ # Tester & exempel (om tillämpligt)
.github/             # Actions, prompts

Produktion (översikt)

Lås CORS/Helmet, rotera JWT_SECRET.

Postgres med backup/PITR + PgBouncer.

Kör prisma migrate deploy vid release.
