"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ProcessMissedDosesButtonProps = {
  patientId: string;
  onFeedback?: (feedback: ScheduleActionFeedback | null) => void;
};

type ProcessMissedDosesResult = {
  processed: number;
};

type ScheduleActionFeedback = {
  kind: "success" | "error";
  message: string;
};

export function ProcessMissedDosesButton({ patientId, onFeedback }: ProcessMissedDosesButtonProps) {
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
      const response = await fetch(`/api/patients/${patientId}/missed-doses/process`, {
        method: "POST",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        const nextError = body?.error || "Unable to process missed doses.";
        if (onFeedback) {
          onFeedback({ kind: "error", message: nextError });
        } else {
          setError(nextError);
        }
        return;
      }

      const body = (await response.json()) as ProcessMissedDosesResult;
      const nextMessage =
        body.processed > 0
          ? `Processed ${body.processed} missed dose(s).`
          : "No missed doses found. Doses become missed after the configured cutoff.";
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
        {isProcessing ? "Processing..." : "Process missed doses"}
      </button>
      {error ? <p className="form-error action-feedback">{error}</p> : null}
      {message ? <p className="form-success action-feedback">{message}</p> : null}
    </div>
  );
}
