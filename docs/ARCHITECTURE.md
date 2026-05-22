# MedTrack Architecture

MedTrack is a Next.js App Router application backed by PostgreSQL through Prisma. The current MVP uses server-rendered pages for most patient workflows and API routes for create/update/action endpoints.

## Application Structure

- `src/app` contains App Router pages and route handlers.
- Patient-facing pages live under `src/app/patients`.
- API routes live under `src/app/api`.
- Shared UI components live under `src/components`.
- Validation and business logic helpers live under `src/lib`.
- Prisma schema and migrations live under `prisma`.

Route-level documentation should stay high-level here. The route files remain the canonical source for request/response details.

## Rendering And Data Flow

- Server-rendered pages load patient-scoped data with Prisma or call internal API routes when that matches existing page behavior.
- Client forms submit JSON to Next.js API routes.
- API routes validate input, check the route's current authorization boundary, and persist through Prisma.
- Most workflows redirect back to list/detail pages after successful create or update.

## Data Access

- Prisma Client is exposed from `src/lib/prisma.ts`.
- PostgreSQL is the local database, usually started with Docker Compose.
- Prisma migrations define database structure.
- `prisma/schema.prisma` is the canonical data model.

## Ownership Model

Clerk is the authentication provider and answers who is signed in. MedTrack keeps authorization in local Prisma tables so the database can answer which patient a user can access and what role they have for that patient.

The auth foundation includes local `User`, `PatientRole`, and `PatientMember` records. `PatientMember` is the patient-scoped access table and is the intended authorization boundary for future route work.

Authorization Rollout Slice 1 converts patient list, root dashboard patient summaries, patient detail, and patient create/detail APIs to `PatientMember` access. New patient creation now stores the creator's local `User.id` in `Patient.createdByUserId` and creates a `PatientMember` row with `PRIMARY_CAREGIVER`.

During the transition, `Patient.createdByUserId` remains a `String` and many non-patient-profile MVP routes still check `createdByUserId = "demo-user"`. Middleware provides signed-in protection for patient-related routes, but remaining medicine, schedule, dose, BP, and follow-up routes still need route-by-route `PatientMember` authorization in future slices. Authorization must be enforced in server-rendered pages and API route handlers, not only in the UI or middleware.

## Validation And Business Helpers

Validation helpers keep user input checks consistent across UI and API routes:

- Patient validation.
- Medicine validation and frequency/timing validation.
- BP reading validation.
- Follow-up validation.
- Dose event action validation.

Business helpers handle reusable workflow rules:

- Schedule generation creates dose events from active medicines and timings.
- Dose action helpers confirm or skip actionable dose events.
- Due dose processing moves recently due pending doses to `DUE`.
- Missed dose processing moves old actionable doses to `MISSED`.
- Today schedule status refresh applies due and missed processing on schedule/dashboard load.
- Medicine stop cleanup marks medicine stopped and deletes only future `PENDING` dose events scheduled after the stop time.

## Safety Architecture

MedTrack stores, reminds, tracks, and coordinates user-entered health data. It must not interpret medical meaning.

The app must not:

- Recommend medicines.
- Change dosages.
- Diagnose.
- Classify BP readings or appointment importance.
- Recommend treatment.
- Recommend doctors.
- Make medical decisions.

OCR and AI are future scope only. If added later, they must require human review and confirmation before any medicine schedule or reminder is activated.
