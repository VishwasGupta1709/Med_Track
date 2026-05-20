# Manual MVP Regression Checklist

Use this checklist for browser-based MVP regression testing against the local Next.js app and local PostgreSQL database. It is not a changelog; keep it focused on flows that should continue working.

## Latest Manual Regression Result

- Date: 2026-05-20
- Environment: local Next.js app with local Docker PostgreSQL
- Result: Passed
- Scope: full MVP regression checklist
- Notes: safe medicine timing removal regression passed, including reducing frequency from `3` to `2` by removing one existing timing row.

## Environment

- Local Next.js app is running.
- Local PostgreSQL is running through Docker.
- Prisma migrations are applied.
- Browser testing is against the local dev server.

## Core Smoke Test

- Patient list loads.
- Patient detail loads.
- Patient dashboard loads.
- Medicine list loads.
- Today's schedule page loads.
- BP reading list loads.
- Follow-up list loads.
- No framework error overlay appears.

## Patient Profile

- Patient can be created with required profile details.
- Patient list shows the created patient.
- Patient detail shows profile fields and navigation to dashboard, medicines, schedule, BP readings, and follow-ups.

## Medicine Tracking

- Medicine can be added manually with one or more timings.
- Medicine frequency display shows caregiver-friendly text for numeric values such as `1` and `2`.
- Frequency/timing mismatch shows a validation error.
- Medicine edit opens, pre-fills existing values, preserves existing timing IDs, and saves changes.
- Medicine edit can reduce frequency from `3` to `2` by removing one existing timing row.
- After timing removal, medicine list shows only the remaining active timings.
- After timing removal, future schedule generation does not create doses for the removed timing.
- Existing historical dose events for removed timings are preserved.
- No copy suggests which timing should be removed.
- Edit submit button says `Save medicine`.

## Medicine Stop

- Active medicines show the stop action.
- Confirmation appears before stopping future reminders.
- Cancel leaves the medicine unchanged.
- Confirm marks the medicine as stopped.
- Stop action disappears after the medicine is stopped.
- Stopping removes only future `PENDING` dose events scheduled after the stop time.
- Past/current dose history and `DUE`, `TAKEN`, `SKIPPED`, `MISSED`, and `LATE` events are preserved.
- Safety confirmation: no medical advice or recommendation wording appears.

## Schedule And Dose Tracking

- Patient with no medicines sees guidance to add medicines manually before generating a schedule.
- Patient with medicines but no generated schedule sees Generate schedule, Add medicine, Back to patient, and Dashboard actions.
- Schedule generation creates today's dose events.
- Confirm taken marks an actionable dose as `TAKEN`.
- Skip marks an actionable dose as `SKIPPED`.
- Today's schedule refreshes due/missed dose statuses before display.
- Old pending doses do not stay visually stale.
- Stopped medicine history explanation appears on dashboard and schedule pages.

## Patient Dashboard

- Dashboard shows due now, missed today, next upcoming dose, completed today, and skipped today.
- Dashboard stays scannable when there are many missed doses.
- Dashboard links to today's schedule for full dose history.
- Empty-state and compact-dashboard action buttons wrap cleanly on mobile viewport.

## BP Tracking

- No BP readings empty state explains manual history and shows Add BP reading plus Back to patient.
- BP form labels include `mmHg`/`bpm` units and neutral helper copy.
- Blank, invalid, and very large values show validation errors.
- Valid reading without pulse or notes saves and appears in history.
- Valid reading with pulse and notes saves and displays optional fields.
- BP history is newest-first.
- BP reading correction opens from Edit reading, pre-fills values, saves changes, and allows optional pulse/notes to be cleared.
- No diagnostic BP wording or value classification appears.

## Follow-Up Tracking

- No follow-ups empty state explains that follow-up details can be recorded and shows Add follow-up plus Back to patient.
- Follow-up form shows neutral helper copy and does not interpret appointment details.
- Blank or invalid appointment date/time shows a validation error.
- Valid appointment with only date/time saves and appears in the follow-up list.
- Valid appointment with doctor, hospital, reason, and notes saves and displays optional fields.
- Follow-up list shows appointments in appointment date/time order.
- Follow-up card shows Edit follow-up.
- Edit page opens from the follow-up list.
- Edit page pre-fills appointment date/time, doctor, hospital, reason, and notes.
- Saving changed appointment details returns to the follow-up list.
- Clearing doctor, hospital, reason, and notes saves and removes those optional fields from display.
- Invalid appointment date/time shows a validation error.
- Invalid patient or follow-up edit URL shows 404.
- Navigation works from patient to follow-ups, from follow-ups to Add follow-up, back to follow-ups, and back to patient.
- No medical advice, urgency wording, appointment importance classification, treatment recommendation, or doctor recommendation appears.

## Safety Rule Confirmation

- No medical advice, diagnosis, BP interpretation, appointment importance classification, dosage recommendation, doctor recommendation, OCR, AI parsing, production notifications, or calendar integration appears as implemented behavior.

## Screenshots To Capture Manually

- Patient detail.
- Patient dashboard.
- Medicine list.
- Schedule after generation.
- Schedule after due/missed processing.
- BP reading list.
- Follow-up list.
