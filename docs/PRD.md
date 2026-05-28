# MedTrack PRD

## Problem

A patient must take medicines on time after a heart-related medical event. Family members need a reliable way to track dose schedules, confirmations, missed doses, BP readings, and follow-ups.

## Safety Boundary

MedTrack records, reminds, tracks, and coordinates. It must not recommend medicines, change dosages, diagnose, classify readings, recommend treatment, recommend doctors, or make medical decisions.

OCR and AI are future scope only. They must never activate reminders or schedules without human review and confirmation.

## MVP

The current MVP supports patient profile, manual medicine entry, medicine schedule generation, dose confirmation, skipped dose tracking, missed dose tracking, patient dashboard, BP tracking, follow-up tracking, and core patient-member authorization.

BP tracking records readings only. Follow-up tracking records appointments only. Patient access is scoped through local `PatientMember` rows with `PRIMARY_CAREGIVER`, `CAREGIVER`, and `VIEWER` roles. Production notification delivery, BP reminder delivery, and follow-up reminder delivery are future scope.

## Not in MVP

Production notifications, BP reminder delivery, follow-up reminder delivery, calendar integration, OCR, AI prescription parsing, WhatsApp/SMS/email alerts, reports/PDF export, mobile app, diet tracking, doctor portal, and wearable integrations.

## Primary Users

- Primary caregiver
- Family caregiver
- Patient

## Success Criteria

- Caregiver can create patient profile.
- Caregiver can add medicines manually.
- App shows today's dose schedule.
- Family member can mark dose as taken.
- App shows missed doses clearly.
- Caregiver can record BP readings without interpretation.
- Caregiver can record follow-up appointments without appointment importance classification.
