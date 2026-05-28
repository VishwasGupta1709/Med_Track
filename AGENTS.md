# AGENTS.md

## Commands
- Use npm; `package-lock.json` is the lockfile.
- First setup: `npm install`, copy `.env.example` to `.env`, add Clerk dev keys, `docker compose up -d`, `npx prisma generate`, `npx prisma migrate dev`.
- Fast local startup on Windows: `npm run dev:start`; it checks Docker, starts `medtrack-postgres`, runs `prisma generate`, checks migration status, then starts Next.js.
- Stop local dev without deleting DB data: `npm run dev:stop`.
- Verification: `npm run lint`, `npm test`, `npm run build`. There is no separate typecheck script; `next build` is the configured full build/type verification.
- Focused tests: `npx vitest run <path-or-pattern>`; tests run in Node and usually mock Prisma rather than requiring Postgres.
- Prisma shortcuts: `npm run prisma:generate`, `npm run prisma:migrate`, or `npx prisma studio`.

## Local Services
- Local Postgres is Docker Compose service `postgres`, container `medtrack-postgres`, exposed on `localhost:5432` with database/user/password `medtrack`/`postgres`/`postgres` per `.env.example`.
- Run `npx prisma migrate dev` after pulling migrations; `dev:start` only checks migration status and tells you to migrate if needed.
- Do not casually change port `5432` or the default `DATABASE_URL`; docs and helper scripts assume it.

## App Structure
- This is a single Next.js App Router app, not a monorepo.
- Pages and route handlers live in `src/app`; patient pages are under `src/app/patients`, API routes under `src/app/api`.
- Shared UI is in `src/components`; validation and business workflow helpers are in `src/lib`.
- Prisma Client is exported from `src/lib/prisma.ts`; `prisma/schema.prisma` and `prisma/migrations` are the canonical data model.
- Import alias `@/*` maps to `src/*` in both TypeScript and Vitest.

## Auth And Authorization
- Clerk protects `/`, `/patients(.*)`, `/api/patients(.*)`, and `/api/dose-events(.*)` via `src/middleware.ts`.
- The auth foundation exists (`User`, `PatientMember`, `PatientRole`), but many routes intentionally still scope data with `createdByUserId = "demo-user"` during the transition.
- For authorization rollout work, enforce `PatientMember` access in server-rendered pages and API handlers, not only middleware or UI.
- `npm run claim:demo-data` links existing `createdByUserId = "demo-user"` patient data to a Clerk user; set `CLERK_USER_ID` first and optionally `CLERK_USER_EMAIL` / `CLERK_USER_DISPLAY_NAME`.

## Product Safety Rules
- MedTrack records, reminds, tracks, and coordinates user-entered health data only.
- Do not add behavior or copy that recommends medicines, changes dosages, diagnoses, classifies BP readings or appointment urgency, recommends treatment/doctors, or makes medical decisions.
- OCR/AI prescription parsing is future scope only and must require human review before any schedule or reminder is activated.

## Domain Gotchas
- Dose events store medicine/timing snapshot fields; preserve historical dose context when medicines or timings change.
- Stopping a medicine must remove only future `PENDING` dose events after the stop time; past/current and non-pending history must remain.
- Medicine frequency/timing validation requires exact timing counts for values like once daily, twice daily, `2`, `3`, and `4`.
- Today schedule/dashboard pages refresh due and missed dose statuses on load; keep due/missed processing rules in shared helpers.
- BP and follow-up features are record/display only; keep wording neutral and non-interpretive.

## Manual Regression
- `docs/manual-testing.md` is the browser regression checklist for MVP flows when code changes affect patient, medicine, schedule, BP, follow-up, auth, or safety behavior.
