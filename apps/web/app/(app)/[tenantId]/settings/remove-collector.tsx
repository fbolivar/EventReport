"use client";

import { useActionState } from "react";

import { Button } from "@/components/shared/button";
import { removeCollector, type EnrolmentState } from "./enrolment";

const initialState: EnrolmentState = {};

/** Retirar un colector que ya no existe o que quedó de un intento fallido. */
export function RemoveCollector({
  tenantId,
  collectorId,
}: {
  tenantId: string;
  collectorId: string;
}) {
  const [state, action, pending] = useActionState(removeCollector, initialState);

  return (
    <form action={action} className="mt-2">
      <input type="hidden" name="tenant" value={tenantId} />
      <input type="hidden" name="collector" value={collectorId} />
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "Retirando…" : "Retirar"}
      </Button>
      {state.error ? (
        <p role="alert" className="mt-1 text-micro text-critical">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
