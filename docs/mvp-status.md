# MedTrack MVP Status

This document summarizes the current MedTrack MVP implementation. It separates what exists today from future scope so the project does not overclaim medical, notification, auth, or AI capabilities.

Latest manual MVP regression pass completed locally on 2026-05-20.

## Completed Features

### Patient Profile

- Create, list, and view patient profiles.
- Patient ownership is scoped with the current `createdByUserId = "demo-user"` placeholder.

### Medicine Tracking

- Manual medicine entry with optional dosage, form, frequency, food instruction, instructions, start date, end date, and timings.
- Medicine list and edit flows.
- Frequency/timing validation requires the entered timing count to match frequency values such as once daily, twice daily, `2`, `3`, and `4`.
- Medicine edit supports soft-removing timings while preserving historical dose events.
- Medicine stop flow marks a medicine as stopped and removes only future `PENDING` dose events scheduled after the stop time.
- Existing dose history is preserved when a medicine is stopped.

### Schedule And Dose Tracking

- Schedule generation creates dose events from active medicines and timings.
- Today's schedule page shows dose events grouped by status.
- Dose statuses include `PENDING`, `DUE`, `TAKEN`, `SKIPPED`, `MISSED`, and `LATE`.
- Caregivers can confirm taken doses and skip doses.
- Missed and due dose processing exists.
- Schedule and patient dashboard pages refresh today's dose statuses on load.

### Dashboard

- Patient dashboard exists at `/patients/[id]/dashboard`.
- Dashboard shows due now, missed today, next upcoming dose, completed today, and skipped today.
- Dashboard and schedule empty states have been polished for MVP use.

### BP Tracking

- BP readings can be created, listed, and edited for correction.
- Validation checks systolic `1..300`, diastolic `1..200`, optional pulse `1..250`, and valid measured time.
- UI copy is neutral and does not classify readings or provide medical interpretation.

### Follow-Up Tracking

- Follow-up appointments can be created and listed.
- Follow-up appointments can be edited for correction.
- Validation checks appointment date/time and supported status.
- Follow-up API route tests cover ownership, validation, creation, edit correction, optional field normalization, and list ordering.
- Follow-up UI is polished with neutral helper copy and navigation.
- No reminder delivery, notification delivery, or calendar integration exists yet.

## Not Implemented Yet

- Real authentication and family role permissions.
- Production notification delivery.
- Calendar integration.
- BP reminder delivery.
- Follow-up reminder delivery.
- BP charts.
- BP delete or mark-incorrect flow.
- Follow-up delete, complete, or cancelled status flow.
- OCR or AI prescription upload.
- Reports or PDF export.
- WhatsApp, SMS, or email delivery.

## Current Limitations

- `createdByUserId = "demo-user"` is a placeholder ownership model.
- The app is currently a local development MVP.
- Local data is stored in local PostgreSQL and does not sync between machines.
- There is no production deployment, production auth, or production notification service.
- The app records and displays user-entered health data but does not interpret medical meaning.

## Recommended Next Milestones

- Plan follow-up delete or complete/cancelled status only after correction workflows are stable.
- Plan real auth and family access roles.
- Design reminder notification delivery with explicit caregiver-controlled setup.
- Plan BP charts and reports after the manual tracking workflow stays stable.
- Consider OCR only after manual medicine workflow, review, and confirmation flows are stable.
