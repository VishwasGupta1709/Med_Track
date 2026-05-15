"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type DoseEventActionsProps = {
  doseEventId: string;
};

export function DoseEventActions({ doseEventId }: DoseEventActionsProps) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState<"confirm" | "skip" | null>(null);

  async function submitAction(action: "confirm" | "skip") {
    setError("");
    setIsSubmitting(action);

    const payload =
      action === "confirm"
        ? { confirmationNote: note }
        : { skippedReason: note };

    try {
      const response = await fetch(`/api/dose-events/${doseEventId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string; errors?: Record<string, string> }
          | null;
        setError(
          body?.error ||
            body?.errors?.confirmationNote ||
            body?.errors?.skippedReason ||
            "Unable to update dose.",
        );
        return;
      }

      setNote("");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(null);
    }
  }

  return (
    <div className="dose-actions">
      <label>
        Note or skip reason
        <input
          type="text"
          value={note}
          maxLength={500}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Optional"
        />
      </label>
      <div className="dose-action-buttons">
        <button
          className="primary-button"
          type="button"
          disabled={isSubmitting !== null}
          onClick={() => submitAction("confirm")}
        >
          {isSubmitting === "confirm" ? "Saving..." : "Mark Taken"}
        </button>
        <button
          className="secondary-button"
          type="button"
          disabled={isSubmitting !== null}
          onClick={() => submitAction("skip")}
        >
          {isSubmitting === "skip" ? "Saving..." : "Skip"}
        </button>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
