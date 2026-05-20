# MedTrack Data Model

`prisma/schema.prisma` is the canonical source for the MedTrack data model. This document summarizes the current models and relationships without duplicating every scalar field.

## Patient

`Patient` is the root record for a person being tracked. It stores profile details and the current MVP ownership placeholder, `createdByUserId`.

Relationships:

- One patient has many medicines.
- One patient has many dose events.
- One patient has many BP readings.
- One patient has many follow-up appointments.

## Medicine

`Medicine` stores manually entered medicine details for a patient, including name, optional dosage/form/frequency/instructions, status, and date range.

Important behavior:

- Medicines are manually entered by a caregiver.
- Active medicines are used for schedule generation.
- Stopped medicines preserve dose history.
- Stopping a medicine removes only future `PENDING` dose events scheduled after the stop time.

## MedicineTiming

`MedicineTiming` stores a time-of-day entry for a medicine. A medicine can have multiple timings.

Important behavior:

- Frequency/timing validation requires the timing count to match frequencies such as once daily, twice daily, `2`, `3`, and `4`.
- Dose events are generated from medicine timings.

## DoseEvent

`DoseEvent` stores a scheduled dose instance for a patient, medicine, and medicine timing.

Important behavior:

- Dose statuses include `PENDING`, `DUE`, `TAKEN`, `SKIPPED`, `MISSED`, and `LATE`.
- Dose events include snapshot fields for medicine name, dosage, food instruction, instructions, timing label, and timing time.
- Snapshot fields preserve historical context even if a medicine is edited later.
- Confirm and skip actions update actionable dose events.
- Due and missed processing updates current schedule state while preserving completed/skipped/missed history.

## BPReading

`BPReading` stores a manually entered BP measurement for a patient.

Important behavior:

- Stores systolic, diastolic, optional pulse, measured time, and optional notes.
- Supports create, list, and edit correction flows.
- It is record/display only and does not classify readings or provide medical interpretation.

## FollowUp

`FollowUp` stores a manually entered appointment for a patient.

Important behavior:

- Stores appointment time plus optional doctor, hospital, reason, notes, and status.
- Current status support is limited to `UPCOMING`.
- It is manual appointment tracking only.
- It does not decide urgency, classify appointment importance, recommend doctors, recommend treatment, or provide medical advice.
