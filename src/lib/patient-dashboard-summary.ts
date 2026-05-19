import { DOSE_STATUS } from "@/lib/dose-status";

export type PatientDashboardDoseEvent = {
  scheduledAt: Date;
  status: string;
};

export type PatientDashboardSummary<TDoseEvent extends PatientDashboardDoseEvent> = {
  dueNow: TDoseEvent[];
  missedToday: TDoseEvent[];
  nextUpcomingDose: TDoseEvent | null;
  completedToday: TDoseEvent[];
  skippedToday: TDoseEvent[];
  summaryLabel: string;
};

export function createPatientDashboardSummary<TDoseEvent extends PatientDashboardDoseEvent>(
  doseEvents: TDoseEvent[],
  now: Date,
): PatientDashboardSummary<TDoseEvent> {
  const dueNow = doseEvents.filter((doseEvent) => doseEvent.status === DOSE_STATUS.DUE);
  const missedToday = doseEvents.filter((doseEvent) => doseEvent.status === DOSE_STATUS.MISSED);
  const completedToday = doseEvents.filter((doseEvent) => doseEvent.status === DOSE_STATUS.TAKEN);
  const skippedToday = doseEvents.filter((doseEvent) => doseEvent.status === DOSE_STATUS.SKIPPED);
  const nextUpcomingDose =
    doseEvents.find(
      (doseEvent) =>
        doseEvent.status === DOSE_STATUS.PENDING &&
        doseEvent.scheduledAt.getTime() >= now.getTime(),
    ) || null;

  let summaryLabel = "No doses generated for today";

  if (dueNow.length > 0) {
    summaryLabel = "Needs attention now";
  } else if (missedToday.length > 0) {
    summaryLabel = "Missed doses today";
  } else if (nextUpcomingDose) {
    summaryLabel = "Schedule okay right now";
  } else if (completedToday.length > 0 || skippedToday.length > 0 || missedToday.length > 0) {
    summaryLabel = "No upcoming doses remaining today";
  }

  return {
    dueNow,
    missedToday,
    nextUpcomingDose,
    completedToday,
    skippedToday,
    summaryLabel,
  };
}
