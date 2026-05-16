"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ScheduleGenerateButtonProps = {
  patientId: string;
  onFeedback?: (feedback: ScheduleActionFeedback | null) => void;
};

type ScheduleGenerateResult = {
  created: number;
};

type ScheduleActionFeedback = {
  kind: "success" | "error";
  message: string;
};

export function ScheduleGenerateButton({ patientId, onFeedback }: ScheduleGenerateButtonProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleGenerate() {
    setError("");
    setMessage("");
    onFeedback?.(null);
    setIsGenerating(true);

    try {
      const response = await fetch(`/api/patients/${patientId}/schedule/generate`, {
        method: "POST",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        const nextError = body?.error || "Unable to generate schedule.";
        if (onFeedback) {
          onFeedback({ kind: "error", message: nextError });
        } else {
          setError(nextError);
        }
        return;
      }

      const body = (await response.json()) as ScheduleGenerateResult;
      const nextMessage =
        body.created > 0
          ? `Generated ${body.created} new dose event(s).`
          : "Schedule is already up to date.";
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
