"use client";

import { useActionState } from "react";

import { acknowledgeEvent, type DecisionState } from "@/app/(app)/[tenantId]/findings/actions";

const initialState: DecisionState = {};

/**
 * Marking an event as treated is not cosmetic: untreated events past seven days
 * are exactly what OP-002 counts, so this button moves a compliance rule.
 */
export function AcknowledgeEvent({ tenantId, eventId }: { tenantId: string; eventId: string }) {
  const [state, action, pending] = useActionState(acknowledgeEvent, initialState);

  return (
    <form action={action}>
      <input type="hidden" name="tenant" value={tenantId} />
      <input type="hidden" name="event" value={eventId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-control text-micro text-signal transition-colors duration-[var(--er-duration-fast)] hover:text-signal-hover disabled:opacity-50"
      >
        {pending ? "Marcando…" : "Marcar atendido"}
      </button>
      {state.error ? (
        <span role="alert" className="ml-2 text-micro text-critical">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
