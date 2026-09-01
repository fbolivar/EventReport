"use client";

import { useActionState, useState } from "react";
import type { ControlStatus, FrameworkCode } from "@eventreport/schema";

import {
  clearNotApplicable,
  markNotApplicable,
  type ScopeState,
} from "@/app/(app)/[tenantId]/compliance/actions";
import { Button } from "@/components/shared/button";

const initialState: ScopeState = {};

/**
 * Declaring a control out of scope (§15.5). The justification is what the
 * auditor reads, so it is required and it is stored with who wrote it.
 */
export function ScopeDecision({
  tenantId,
  framework,
  control,
  status,
}: {
  tenantId: string;
  framework: FrameworkCode;
  control: string;
  status: ControlStatus;
}) {
  const [open, setOpen] = useState(false);
  const [markState, mark, marking] = useActionState(markNotApplicable, initialState);
  const [clearState, clear, clearing] = useActionState(clearNotApplicable, initialState);

  if (status === "not_applicable") {
    return (
      <form action={clear}>
        <input type="hidden" name="tenant" value={tenantId} />
        <input type="hidden" name="framework" value={framework} />
        <input type="hidden" name="control" value={control} />
        <button
          type="submit"
          disabled={clearing}
          className="rounded-control text-micro text-signal hover:text-signal-hover disabled:opacity-50"
        >
          {clearing ? "Devolviendo…" : "Devolver al alcance"}
        </button>
        {clearState.error ? (
          <span role="alert" className="ml-2 text-micro text-critical">
            {clearState.error}
          </span>
        ) : null}
      </form>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-control text-micro text-ink-soft hover:text-ink"
      >
        Declarar fuera de alcance
      </button>
    );
  }

  return (
    <form action={mark} className="mt-2 w-full">
      <input type="hidden" name="tenant" value={tenantId} />
      <input type="hidden" name="framework" value={framework} />
      <input type="hidden" name="control" value={control} />
      <label htmlFor={`scope-${control}`} className="text-micro text-ink-soft">
        Por qué está fuera de alcance
      </label>
      <textarea
        id={`scope-${control}`}
        name="justification"
        rows={2}
        required
        minLength={15}
        className="mt-1 w-full rounded-control border border-line bg-paper px-3 py-2 text-small"
      />
      <div className="mt-2 flex gap-2">
        <Button type="submit" variant="secondary" size="sm" disabled={marking}>
          {marking ? "Guardando…" : "Guardar"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
      {markState.error ? (
        <p role="alert" className="mt-2 text-small text-critical">
          {markState.error}
        </p>
      ) : null}
    </form>
  );
}
