import { describe, expect, it } from "vitest";
import { DOSE_STATUS } from "@/lib/dose-status";
import { createPatientDashboardSummary } from "@/lib/patient-dashboard-summary";

function createDoseEvent(id: string, status: string, scheduledAt: string) {
  return {
    id,
    status,
    scheduledAt: new Date(scheduledAt),
  };
}

const NOW = new Date("2026-05-16T14:29:00.000Z");

describe("createPatientDashboardSummary", () => {
  it("includes only DUE doses in dueNow", () => {
    const dueDose = createDoseEvent("due-1", DOSE_STATUS.DUE, "2026-05-16T14:20:00.000Z");
    const pendingDose = createDoseEvent("pending-1", DOSE_STATUS.PENDING, "2026-05-16T15:00:00.000Z");

    const summary = createPatientDashboardSummary([dueDose, pendingDose], NOW);

    expect(summary.dueNow).toEqual([dueDose]);
  });

  it("includes only MISSED doses in missedToday", () => {
    const missedDose = createDoseEvent("missed-1", DOSE_STATUS.MISSED, "2026-05-16T09:00:00.000Z");
    const dueDose = createDoseEvent("due-1", DOSE_STATUS.DUE, "2026-05-16T14:20:00.000Z");

    const summary = createPatientDashboardSummary([missedDose, dueDose], NOW);

    expect(summary.missedToday).toEqual([missedDose]);
  });

  it("selects the earliest future or current PENDING dose as nextUpcomingDose", () => {
    const laterDose = createDoseEvent("pending-2", DOSE_STATUS.PENDING, "2026-05-16T17:00:00.000Z");
    const currentDose = createDoseEvent("pending-1", DOSE_STATUS.PENDING, "2026-05-16T14:29:00.000Z");
    const pastDose = createDoseEvent("pending-0", DOSE_STATUS.PENDING, "2026-05-16T14:00:00.000Z");

    const summary = createPatientDashboardSummary([pastDose, currentDose, laterDose], NOW);

    expect(summary.nextUpcomingDose).toBe(currentDose);
  });

  it("includes only TAKEN doses in completedToday", () => {
    const takenDose = createDoseEvent("taken-1", DOSE_STATUS.TAKEN, "2026-05-16T08:00:00.000Z");
    const skippedDose = createDoseEvent("skipped-1", DOSE_STATUS.SKIPPED, "2026-05-16T09:00:00.000Z");

    const summary = createPatientDashboardSummary([takenDose, skippedDose], NOW);

    expect(summary.completedToday).toEqual([takenDose]);
  });

  it("includes only SKIPPED doses in skippedToday", () => {
    const skippedDose = createDoseEvent("skipped-1", DOSE_STATUS.SKIPPED, "2026-05-16T09:00:00.000Z");
    const takenDose = createDoseEvent("taken-1", DOSE_STATUS.TAKEN, "2026-05-16T08:00:00.000Z");

    const summary = createPatientDashboardSummary([skippedDose, takenDose], NOW);

    expect(summary.skippedToday).toEqual([skippedDose]);
  });

  it("prioritizes DUE over MISSED for the summary label", () => {
    const dueDose = createDoseEvent("due-1", DOSE_STATUS.DUE, "2026-05-16T14:20:00.000Z");
    const missedDose = createDoseEvent("missed-1", DOSE_STATUS.MISSED, "2026-05-16T09:00:00.000Z");

    const summary = createPatientDashboardSummary([missedDose, dueDose], NOW);

    expect(summary.summaryLabel).toBe("Needs attention now");
  });

  it("shows missed label when no due dose exists but missed doses exist", () => {
    const missedDose = createDoseEvent("missed-1", DOSE_STATUS.MISSED, "2026-05-16T09:00:00.000Z");

    const summary = createPatientDashboardSummary([missedDose], NOW);

    expect(summary.summaryLabel).toBe("Missed doses today");
  });

  it("shows schedule okay when only future pending doses exist", () => {
    const pendingDose = createDoseEvent("pending-1", DOSE_STATUS.PENDING, "2026-05-16T15:00:00.000Z");

    const summary = createPatientDashboardSummary([pendingDose], NOW);

    expect(summary.summaryLabel).toBe("Schedule okay right now");
  });

  it("shows no upcoming label when only completed or skipped records exist", () => {
    const takenDose = createDoseEvent("taken-1", DOSE_STATUS.TAKEN, "2026-05-16T08:00:00.000Z");
    const skippedDose = createDoseEvent("skipped-1", DOSE_STATUS.SKIPPED, "2026-05-16T09:00:00.000Z");

    const summary = createPatientDashboardSummary([takenDose, skippedDose], NOW);

    expect(summary.summaryLabel).toBe("No upcoming doses remaining today");
  });

  it("shows no doses generated when there are no dose events", () => {
    const summary = createPatientDashboardSummary([], NOW);

    expect(summary.summaryLabel).toBe("No doses generated for today");
  });
});
