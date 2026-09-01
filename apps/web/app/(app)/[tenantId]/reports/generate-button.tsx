"use client";

import { useActionState } from "react";

import { Button } from "@/components/shared/button";
import { generateExecutiveReport, type GenerateState } from "./actions";

const initialState: GenerateState = {};

export function GenerateReportButton({ tenantId }: { tenantId: string }) {
  const [state, formAction, pending] = useActionState(generateExecutiveReport, initialState);

  return (
    <form action={formAction} className="flex items-center gap-3">
      <input type="hidden" name="tenant" value={tenantId} />
      <Button type="submit" disabled={pending}>
        {pending ? "Generando…" : "Generar informe"}
      </Button>
      {state.error ? (
        <span role="alert" className="text-small text-critical">
          {state.error}
        </span>
      ) : null}
      {state.ok ? <span className="text-small text-ink-soft">{state.ok}</span> : null}
    </form>
  );
}
