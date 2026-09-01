"use client";

import { useActionState } from "react";
import type { FindingStatus } from "@eventreport/schema";

import { acceptRisk, reopenFinding, type DecisionState } from "@/app/(app)/[tenantId]/findings/actions";
import { Button } from "@/components/shared/button";

const initialState: DecisionState = {};

/**
 * Accepting a risk is a decision, not a dismissal: it asks for the reason and
 * keeps it. The rules engine reads that state and stops reopening the finding,
 * so the customer is not fighting the product every time a snapshot arrives.
 */
export function RiskDecision({
  tenantId,
  findingId,
  status,
  justification,
}: {
  tenantId: string;
  findingId: string;
  status: FindingStatus;
  justification?: string;
}) {
  const [acceptState, accept, accepting] = useActionState(acceptRisk, initialState);
  const [reopenState, reopen, reopening] = useActionState(reopenFinding, initialState);

  if (status === "resolved") return null;

  if (status === "accepted") {
    return (
      <form action={reopen} className="border-t border-line pt-4">
        <p className="text-micro text-ink-soft">Riesgo aceptado</p>
        {justification ? <p className="mt-1 text-small">{justification}</p> : null}
        <input type="hidden" name="tenant" value={tenantId} />
        <input type="hidden" name="finding" value={findingId} />
        <Button type="submit" variant="secondary" size="sm" disabled={reopening} className="mt-3">
          {reopening ? "Reabriendo…" : "Volver a abrir"}
        </Button>
        {reopenState.error ? (
          <p role="alert" className="mt-2 text-small text-critical">
            {reopenState.error}
          </p>
        ) : null}
      </form>
    );
  }

  return (
    <form action={accept} className="border-t border-line pt-4">
      <label htmlFor={`justification-${findingId}`} className="text-micro text-ink-soft">
        Aceptar el riesgo · escribe por qué, queda en el historial
      </label>
      <input type="hidden" name="tenant" value={tenantId} />
      <input type="hidden" name="finding" value={findingId} />
      <textarea
        id={`justification-${findingId}`}
        name="justification"
        rows={3}
        required
        minLength={15}
        className="mt-1 w-full rounded-control border border-line bg-paper px-3 py-2 text-small"
      />
      <Button type="submit" variant="secondary" size="sm" disabled={accepting} className="mt-2">
        {accepting ? "Guardando…" : "Aceptar el riesgo"}
      </Button>
      {acceptState.error ? (
        <p role="alert" className="mt-2 text-small text-critical">
          {acceptState.error}
        </p>
      ) : null}
    </form>
  );
}
