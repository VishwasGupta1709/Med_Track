export const DOSE_STATUS = {
  PENDING: "PENDING",
  DUE: "DUE",
  TAKEN: "TAKEN",
  SKIPPED: "SKIPPED",
  MISSED: "MISSED",
  LATE: "LATE",
} as const;

export type DoseStatus = (typeof DOSE_STATUS)[keyof typeof DOSE_STATUS];

export const ACTIONABLE_DOSE_STATUSES = [DOSE_STATUS.PENDING, DOSE_STATUS.DUE] as const;

export const TERMINAL_DOSE_STATUSES = [
  DOSE_STATUS.TAKEN,
  DOSE_STATUS.SKIPPED,
  DOSE_STATUS.MISSED,
] as const;
