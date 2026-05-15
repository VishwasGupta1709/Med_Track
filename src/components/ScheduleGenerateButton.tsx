"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ScheduleGenerateButtonProps = {
  patientId: string;
};

type ScheduleGenerateResult = {
  created: number;
};

export function ScheduleGenerateButton({ patientId }: ScheduleGenerateButtonProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleGenerate() {
    setError("");
    setMessage("");
    setIsGenerating(true);

    try {
      const response = await fetch(`/api/patients/${patientId}/schedule/generate`, {
        method: "POST",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error || "Unable to generate schedule.");
        return;
      }

      const body = (await response.json()) as ScheduleGenerateResult;
      setMessage(
        body.created > 0
          ? `Generated ${body.created} new dose event(s).`
          : "Schedule is already up to date.",
      );
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="schedule-action-item">
      <button className="primary-button" type="button" disabled={isGenerating} onClick={handleGenerate}>
        {isGenerating ? "Generating..." : "Generate schedule"}
      </button>
      {error ? <p className="form-error action-feedback">{error}</p> : null}
      {message ? <p className="form-success action-feedback">{message}</p> : null}
    </div>
  );
}
