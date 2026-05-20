# Manual MVP Browser Testing Notes

## Date

- 2026-05-16

## Environment

- Local Next.js app
- Local PostgreSQL via Docker
- Prisma migrations applied
- Browser manual testing against local dev server

## Tested Flows

- Dashboard loads
- Patient detail loads
- Medicine list works
- Schedule generation works
- Due dose processing works
- Missed dose processing works
- BP reading list works
- Follow-up list works
- Dashboard summary reflects current data

## Pass/Fail Summary

- Overall: PASS with non-blocking UI/data notes
- No blocker found in tested MVP flows

## Screenshots To Capture Manually

- Dashboard
- Patient detail
- Medicine list
- Schedule after generation
- Schedule after due/missed processing
- BP reading list
- Follow-up list

## Bugs/Issues Found

- Local database contains old test data, so dashboard counts include previous patients, medicines, and dose events
- Test data contains typos, not a code bug

## Non-Blocking UI Improvements

- Schedule action result messages may remain visible and feel stale/confusing

## Dashboard And Schedule UX Polish Manual Test

- Patient with no medicines sees guidance to add medicines manually before generating a schedule
- Patient with medicines but no generated schedule sees Generate schedule, Add medicine, Back to patient, and Dashboard actions
- Dashboard stays scannable when there are many missed doses and links to today's schedule for the full history
- Stopped medicine history explanation appears on dashboard and schedule pages
- Empty-state and compact-dashboard action buttons wrap cleanly on mobile viewport

## BP Tracking Manual Test

- No BP readings empty state explains manual history and shows Add BP reading plus Back to patient
- BP form labels include mmHg/bpm units and neutral helper copy
- Blank, invalid, and very large values show validation errors
- Valid reading without pulse or notes saves and appears in history
- Valid reading with pulse and notes saves and displays those optional fields
- BP history is newest-first
- BP reading correction opens from Edit reading, pre-fills values, saves changes, and allows optional pulse/notes to be cleared
- No diagnostic BP wording or value classification appears

## Follow-Up Manual Test

- No follow-ups empty state explains that follow-up details can be recorded and shows Add follow-up plus Back to patient
- Follow-up form shows neutral helper copy and does not interpret appointment details
- Blank or invalid appointment date/time shows a validation error
- Valid appointment with only date/time saves and appears in the follow-up list
- Valid appointment with doctor, hospital, reason, and notes saves and displays those optional fields
- Follow-up list shows appointments in appointment date/time order
- Navigation works from patient to follow-ups, from follow-ups to Add follow-up, back to follow-ups, and back to patient
- No medical advice, urgency wording, appointment importance classification, treatment recommendation, or doctor recommendation appears

## Completed UI Improvements

- Medicine frequency display now shows numeric values like "1" and "2" as caregiver-friendly text such as "Once daily" and "2 times daily"
- Today's schedule refreshes due/missed dose statuses before display so old pending doses do not stay visually stale
- Patient dashboard shows due, missed, next, completed, and skipped dose sections for today's schedule
- Medicine form requires the number of entered timings to match numeric frequency such as once daily, 2, 3, or 4 times daily

## Medicine Stop UI Manual Test

- Current result: passed
- ACTIVE medicines show the "Stop medicine" action
- Confirmation appears before stopping future reminders
- Cancel leaves the medicine unchanged
- Confirm calls the existing stop route
- Medicine becomes STOPPED after confirmation
- Stop action disappears after the medicine is stopped
- Stopping removes future reminders but preserves dose history
- Stopping at 12:00 PM preserves a 9:00 AM pending/due dose for later missed-dose processing
- Stopping only removes future PENDING dose events scheduled after the stop time
- Safety confirmation: no medical advice or recommendation wording appears

## Safety Rule Confirmation

- No medical advice, diagnosis, BP interpretation, dosage recommendations, OCR, AI parsing, or notifications were added or observed as part of this task

## Recommended Next Development Step

- Improve stale schedule action feedback while keeping behavior unchanged
