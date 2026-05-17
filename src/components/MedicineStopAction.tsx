"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type MedicineStopActionProps = {
  patientId: string;
  medicineId: string;
  medicineStatus: string;
};

export function MedicineStopAction({
  patientId,
  medicineId,
  medicineStatus,
}: MedicineStopActionProps) {
  const router = useRouter();
  const [isStopping, setIsStopping] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleStop() {
    if (!window.confirm("Stop future reminders for this medicine?")) {
      return;
    }

    setError("");
    setMessage("");
    setIsStopping(true);

    try {
      const response = await fetch(`/api/patients/${patientId}/medicines/${medicineId}/stop`, {
        method: "POST",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error || "Unable to stop medicine.");
        return;
      }

      setMessage("Future reminders stopped.");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsStopping(false);
    }
  }

  if (medicineStatus !== "ACTIVE" && !error && !message) {
    return null;
  }

  return (
    <div className="schedule-action-item">
      {medicineStatus === "ACTIVE" ? (
        <button className="secondary-button" type="button" disabled={isStopping} onClick={handleStop}>
          {isStopping ? "Stopping..." : "Stop medicine"}
        </button>
      ) : null}
      {error ? <p className="form-error action-feedback">{error}</p> : null}
      {message ? <p className="form-success action-feedback">{message}</p> : null}
    </div>
  );
}
