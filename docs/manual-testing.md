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

- Medicine frequency display is unclear when shown as raw values like "2"
- Schedule action result messages may remain visible and feel stale/confusing

## Safety Rule Confirmation

- No medical advice, diagnosis, BP interpretation, dosage recommendations, OCR, AI parsing, or notifications were added or observed as part of this task

## Recommended Next Development Step

- Improve stale schedule action feedback while keeping behavior unchanged
