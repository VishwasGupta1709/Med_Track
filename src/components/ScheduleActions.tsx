"use client";

import Link from "next/link";
import { useState } from "react";
import { ProcessDueDosesButton } from "@/components/ProcessDueDosesButton";
import { ProcessMissedDosesButton } from "@/components/ProcessMissedDosesButton";
import { ScheduleGenerateButton } from "@/components/ScheduleGenerateButton";

type ScheduleActionsProps = {
  patientId: string;
  canGenerateSchedule: boolean;
  canProcessDoseStatuses: boolean;
};

type ScheduleActionFeedback = {
  kind: "success" | "error";
  message: string;
};

export function ScheduleActions({
  patientId,
  canGenerateSchedule,
  canProcessDoseStatuses,
}: ScheduleActionsProps) {
  const [feedback, setFeedback] = useState<ScheduleActionFeedback | null>(null);

  function handleFeedback(nextFeedback: ScheduleActionFeedback | null) {
    setFeedback(
      nextFeedback?.kind === "success"
        ? { ...nextFeedback, message: `Last action: ${nextFeedback.message}` }
        : nextFeedback,
    );
  }

  return (
    <div className="header-actions schedule-actions">
      <Link className="secondary-button" href={`/patients/${patientId}`}>
        Back to patient
      </Link>
      {canGenerateSchedule ? (
        <ScheduleGenerateButton patientId={patientId} onFeedback={handleFeedback} />
      ) : null}
      {canProcessDoseStatuses ? (
        <>
          <ProcessDueDosesButton patientId={patientId} onFeedback={handleFeedback} />
          <ProcessMissedDosesButton patientId={patientId} onFeedback={handleFeedback} />
        </>
      ) : null}
      {feedback ? (
        <p
          className={`${feedback.kind === "error" ? "form-error" : "form-success"} action-feedback`}
          role={feedback.kind === "error" ? "alert" : "status"}
        >
          {feedback.message}
        </p>
      ) : null}
    </div>
  );
}
