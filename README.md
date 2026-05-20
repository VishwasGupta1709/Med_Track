# MedTrack

MedTrack is a medicine tracking and family health reminder app for patients and caregivers. It helps families record patient profiles, manually entered medicines, dose schedules, confirmations, missed doses, BP readings, follow-up appointments, and patient-level dashboard status.

MedTrack is for recording, reminders, tracking, and family coordination only. It must not recommend medicines, change dosages, diagnose, classify readings, recommend treatment, recommend doctors, or make medical decisions. OCR and AI are future scope only and must never activate reminders without human review and confirmation.

## Current Stack

- Next.js App Router
- Next.js API routes
- React
- Prisma ORM
- PostgreSQL
- Docker Compose for local PostgreSQL
- Vitest
- npm for scripts and dependencies

Current MVP ownership uses `createdByUserId = "demo-user"` as a placeholder until real authentication and family roles are added.

## Current MVP Features

- Patient profile create, list, and detail flows.
- Manual medicine entry with medicine timings.
- Medicine list and edit flows.
- Medicine frequency/timing validation, including matching timing count for frequencies such as once daily, twice daily, `2`, `3`, and `4`.
- Medicine stop flow with history-safe cleanup: only future `PENDING` dose events after the stop time are removed.
- Dose schedule generation.
- Today's schedule page.
- Dose confirmation and skip actions.
- Due and missed dose processing.
- Automatic today status refresh on schedule and patient dashboard page load.
- Patient dashboard at `/patients/[id]/dashboard`.
- BP reading list, create, and edit correction flows.
- BP validation for systolic, diastolic, optional pulse, and measured time.
- Follow-up appointment list and create flows.
- Follow-up validation and UX polish.

## Current Limitations

- No real authentication or family role model yet.
- No production notification delivery yet.
- No BP reminder or follow-up reminder delivery yet.
- No calendar integration.
- No OCR or AI prescription upload yet.
- No medical interpretation, diagnosis, classification, treatment guidance, dosage recommendation, or doctor recommendation.
- Local database data does not sync between machines.

## First-Time Setup

Run these from the project root.

1. Install dependencies:

   ```powershell
   npm install
   ```

2. Create your local environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

   Do not commit `.env`. It is local machine configuration.

3. Start PostgreSQL:

   ```powershell
   docker compose up -d
   ```

4. Generate the Prisma client:

   ```powershell
   npx prisma generate
   ```

5. Apply database migrations:

   ```powershell
   npx prisma migrate dev
   ```

6. Start the Next.js development server:

   ```powershell
   npm run dev
   ```

Open the app at:

```text
http://localhost:3000
```

The patient list is at:

```text
http://localhost:3000/patients
```

## Daily Development Workflow

When starting work on a laptop:

```powershell
git pull
docker compose up -d
npx prisma migrate dev
npm run dev
```

Use `npx prisma migrate dev` after pulling so your local database structure catches up with committed migrations.

The project also includes helper scripts:

```powershell
npm run dev:start
npm run dev:stop
```

`dev:start` checks Docker, starts the local PostgreSQL container when needed, generates Prisma client files, checks migration status, and starts Next.js. `dev:stop` stops local dev processes and the PostgreSQL container without deleting database volumes.

## Verification Commands

Run lint:

```powershell
npm run lint
```

Run production build:

```powershell
npm run build
```

Run tests:

```powershell
npm test
```

## Useful Commands

Open Prisma Studio:

```powershell
npx prisma studio
```

Check running Docker containers:

```powershell
docker ps
```

Generate Prisma client manually:

```powershell
npx prisma generate
```

Apply migrations manually:

```powershell
npx prisma migrate dev
```

## Project Docs

- `docs/mvp-status.md`: current completed features, limitations, and next milestones.
- `docs/ARCHITECTURE.md`: high-level app architecture and safety boundaries.
- `docs/data-model.md`: Prisma model and relationship summary.
- `docs/manual-testing.md`: manual MVP regression checklist.
- `docs/PRD.md`: compact product requirements snapshot.

## Troubleshooting

### Docker Pipe Error Or Docker Daemon Not Running

Symptoms may include Docker pipe errors, connection failures, or commands that cannot reach the Docker engine.

Fix:

1. Open Docker Desktop.
2. Wait until Docker says it is running.
3. Re-run:

   ```powershell
   docker compose up -d
   docker ps
   ```

If `docker ps` works and shows `medtrack-postgres`, Docker is available.

### Prisma P1001 Cannot Reach Database

`P1001` usually means Prisma cannot connect to PostgreSQL at the `DATABASE_URL` in `.env`.

Check:

1. Docker is running.
2. PostgreSQL container is running:

   ```powershell
   docker ps
   ```

3. `.env` exists and matches `.env.example`:

   ```text
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/medtrack?schema=public"
   ```

4. Start the database again:

   ```powershell
   docker compose up -d
   ```

5. Re-run migrations:

   ```powershell
   npx prisma migrate dev
   ```

### Next.js `.next` Cache Errors

Symptoms may include errors like:

- `Cannot find module './331.js'`
- missing `routes-manifest.json`
- strange route or build artifacts after switching branches or laptops

Fix:

1. Stop the dev server.
2. Delete the local Next.js cache:

   ```powershell
   Remove-Item -Recurse -Force .next
   ```

3. Restart:

   ```powershell
   npm run dev
   ```

If the issue appears during build, run:

```powershell
Remove-Item -Recurse -Force .next
npm run build
```

### Port 5432 Already In Use

PostgreSQL may fail to start if another local database already uses port `5432`.

Check what is running:

```powershell
docker ps
```

If another local Postgres service is using `5432`, either stop that service or change the local Docker port mapping intentionally in `docker-compose.yml`. Do not change this casually if other laptops or documentation depend on the default URL.

### Local Data Reset Warnings

These commands delete local database data:

```powershell
docker compose down -v
npx prisma migrate reset
```

Do not run them unless you intentionally want to delete your local MedTrack data and recreate the database.

## Two-Laptop Workflow

Use GitHub as the source of truth for code and migrations.

Before working:

```powershell
git pull
docker compose up -d
npx prisma migrate dev
npm run dev
```

Before switching laptops:

```powershell
git status
git add .
git commit -m "Describe the change"
git push
```

Notes:

- Always `git pull` before starting work.
- Always `git push` before switching laptops.
- Local database data does not sync between laptops.
- Prisma migrations sync database structure, not the actual patient, medicine, dose, BP, or follow-up data.
- If one laptop has test data that the other does not, that is expected.
