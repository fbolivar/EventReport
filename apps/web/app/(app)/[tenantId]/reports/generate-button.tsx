"use client";

import { useActionState } from "react";
import type { ReportType } from "@eventreport/schema";

import { Button } from "@/components/shared/button";
import { requestReport, type GenerateState } from "./actions";

const initialState: GenerateState = {};

/**
 * Pide un informe. El trabajo ocurre después de la respuesta, así que el botón
 * se libera enseguida y lo que informa es que el trabajo quedó encargado, no
 * que el PDF esté listo.
 */
export function GenerateReportButton({
  tenantId,
  type = "executive",
  label = "Generar informe",
  variant = "primary",
}: {
  tenantId: string;
  type?: ReportType;
  label?: string;
  variant?: "primary" | "secondary";
}) {
  const [state, formAction, pending] = useActionState(requestReport, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="tenant" value={tenantId} />
      <input type="hidden" name="type" value={type} />
      <Button type="submit" variant={variant} disabled={pending}>
        {pending ? "Encargando…" : label}
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
