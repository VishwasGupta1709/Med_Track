"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ScheduleGenerateButtonProps = {
  patientId: string;
};

export function ScheduleGenerateButton({ patientId }: ScheduleGenerateButtonProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    setError("");
    setIsGenerating(true);

    try {
      const response = await fetch(`/api/patients/${patientId}/schedule/generate`, {
        method: "POST",
      });

      if (response.ok) {
        router.refresh();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <>
      <button className="primary-button" type="button" disabled={isGenerating} onClick={handleGenerate}>
        {isGenerating ? "Generating..." : "Generate schedule"}
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </>
  );
}
