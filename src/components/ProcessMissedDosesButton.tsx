"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ProcessMissedDosesButtonProps = {
  patientId: string;
};

type ProcessMissedDosesResult = {
  processed: number;
};

export function ProcessMissedDosesButton({ patientId }: ProcessMissedDosesButtonProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleProcess() {
    setError("");
    setMessage("");
    setIsProcessing(true);

    try {
      const response = await fetch(`/api/patients/${patientId}/missed-doses/process`, {
        method: "POST",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error || "Unable to process missed doses.");
        return;
      }

      const body = (await response.json()) as ProcessMissedDosesResult;
      setMessage(
        body.processed > 0
          ? `Processed ${body.processed} missed dose(s).`
          : "No missed doses found. Doses become missed after the configured cutoff.",
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
        {isProcessing ? "Processing..." : "Process missed doses"}
      </button>
      {error ? <p className="form-error action-feedback">{error}</p> : null}
      {message ? <p className="form-success action-feedback">{message}</p> : null}
    </div>
  );
}
