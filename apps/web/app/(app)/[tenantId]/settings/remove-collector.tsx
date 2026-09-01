"use client";

import { useActionState } from "react";

import { Button } from "@/components/shared/button";
import { removeCollector, startWatching, type EnrolmentState } from "./enrolment";

const initialState: EnrolmentState = {};

/** Retirar un colector que ya no existe o que quedó de un intento fallido. */
export function RemoveCollector({
  tenantId,
  collectorId,
  measuring,
}: {
  tenantId: string;
  collectorId: string;
  /** En medición: se ofrece terminar el período antes de las 24 h. */
  measuring?: boolean;
}) {
  const [state, action, pending] = useActionState(removeCollector, initialState);
  const [watchState, watch, watching] = useActionState(startWatching, initialState);

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {measuring ? (
        <form action={watch}>
          <input type="hidden" name="tenant" value={tenantId} />
          <input type="hidden" name="collector" value={collectorId} />
          <Button type="submit" variant="secondary" size="sm" disabled={watching}>
            {watching ? "Activando…" : "Empezar a vigilar ahora"}
          </Button>
        </form>
      ) : null}

      <form action={action}>
        <input type="hidden" name="tenant" value={tenantId} />
        <input type="hidden" name="collector" value={collectorId} />
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          {pending ? "Retirando…" : "Retirar"}
        </Button>
      </form>

      {state.error || watchState.error ? (
        <p role="alert" className="w-full text-micro text-critical">
          {state.error ?? watchState.error}
        </p>
      ) : null}
    </div>
  );
}
