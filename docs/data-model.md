# MedTrack Data Model

`prisma/schema.prisma` is the canonical source for the MedTrack data model. This document summarizes the current models and relationships without duplicating every scalar field.

## Patient

`Patient` is the root record for a person being tracked. It stores profile details and legacy ownership metadata in `createdByUserId`.

Relationships:

- One patient has many medicines.
- One patient has many dose events.
- One patient has many BP readings.
- One patient has many follow-up appointments.
- One patient can have many patient members.

`createdByUserId` remains a plain string for legacy/demo ownership metadata and data-claim workflows. It is not the authorization source for core MVP APIs or pages; authorization should use `PatientMember`.

## User

`User` stores the local MedTrack representation of a signed-in Clerk user.

Important behavior:

- `clerkUserId` is unique and links the local user row to Clerk.
- Email and display name are copied from Clerk when a signed-in user is upserted locally.
- A user can have many patient memberships.

## PatientRole

`PatientRole` defines patient-scoped access roles:

- `PRIMARY_CAREGIVER`
- `CAREGIVER`
- `VIEWER`

Current role behavior:

- `PRIMARY_CAREGIVER` is assigned to the patient creator and can manage patient-scoped records, including medicine create/edit/stop actions.
- `CAREGIVER` can manage schedule/dose, BP, and follow-up records but cannot create, edit, or stop medicines.
- `VIEWER` can view patient-scoped records but cannot manage them.

## PatientMember

`PatientMember` links a local user to a patient with a patient-scoped role.

Important behavior:

- A patient/user pair is unique.
- Deleting a patient or user cascades to related memberships.
- `PatientMember` is the main patient-scoped authorization model for patients, medicines, schedule/dose events, BP readings, and follow-ups.
- Legacy patients without membership rows will not appear in signed-in patient lists until claimed or backfilled.

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
