"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ProcessDueDosesButtonProps = {
  patientId: string;
};

export function ProcessDueDosesButton({ patientId }: ProcessDueDosesButtonProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  async function handleProcess() {
    setError("");
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

      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="header-action-stack">
      <button
        className="secondary-button"
        type="button"
        disabled={isProcessing}
        onClick={handleProcess}
      >
        {isProcessing ? "Processing..." : "Process due doses"}
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
