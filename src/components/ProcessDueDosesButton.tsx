"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ProcessDueDosesButtonProps = {
  patientId: string;
};

type ProcessDueDosesResult = {
  processed: number;
};

export function ProcessDueDosesButton({ patientId }: ProcessDueDosesButtonProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleProcess() {
    setError("");
    setMessage("");
    setIsProcessing(true);

    try {
      const response = await fetch(`/api/patients/${patientId}/due-doses/process`, {
        method: "POST",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error || "Unable to process due doses.");
        return;
      }

      const body = (await response.json()) as ProcessDueDosesResult;
      setMessage(
        body.processed > 0
          ? `Processed ${body.processed} due dose(s).`
          : "No doses are due right now.",
      );
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
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
