"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ScheduleGenerateButtonProps = {
  patientId: string;
};

export function ScheduleGenerateButton({ patientId }: ScheduleGenerateButtonProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleGenerate() {
    setIsGenerating(true);

    const response = await fetch(`/api/patients/${patientId}/schedule/generate`, {
      method: "POST",
    });

    setIsGenerating(false);

    if (response.ok) {
      router.refresh();
    }
  }

  return (
    <button className="primary-button" type="button" disabled={isGenerating} onClick={handleGenerate}>
      {isGenerating ? "Generating..." : "Generate schedule"}
    </button>
  );
}
