"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ProcessDueDosesButtonProps = {
  patientId: string;
  onFeedback?: (feedback: ScheduleActionFeedback | null) => void;
};

type ProcessDueDosesResult = {
  processed: number;
};

type ScheduleActionFeedback = {
  kind: "success" | "error";
  message: string;
};

export function ProcessDueDosesButton({ patientId, onFeedback }: ProcessDueDosesButtonProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleProcess() {
    setError("");
    setMessage("");
    onFeedback?.(null);
    setIsProcessing(true);

    try {
      const response = await fetch(`/api/patients/${patientId}/due-doses/process`, {
        method: "POST",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        const nextError = body?.error || "Unable to process due doses.";
        if (onFeedback) {
          onFeedback({ kind: "error", message: nextError });
        } else {
          setError(nextError);
        }
        return;
      }

      const body = (await response.json()) as ProcessDueDosesResult;
      const nextMessage =
        body.processed > 0
          ? `Processed ${body.processed} due dose(s).`
          : "No doses are due right now.";
      if (onFeedback) {
        onFeedback({ kind: "success", message: nextMessage });
      } else {
        setMessage(nextMessage);
      }
      router.refresh();
    } catch {
      const nextError = "Network error. Please try again.";
      if (onFeedback) {
        onFeedback({ kind: "error", message: nextError });
      } else {
        setError(nextError);
      }
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="schedule-action-item">
      <button
        className="secondary-button"
        type="button"
        disabled={isProcessing}
        onClick={handleProcess}
      >
        {isProcessing ? "Processing..." : "Process due doses"}
      </button>
      {error ? <p className="form-error action-feedback">{error}</p> : null}
      {message ? <p className="form-success action-feedback">{message}</p> : null}
    </div>
  );
}
