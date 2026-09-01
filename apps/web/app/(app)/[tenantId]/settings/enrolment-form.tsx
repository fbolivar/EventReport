"use client";

import { useActionState } from "react";

import { Button } from "@/components/shared/button";
import { Value } from "@/components/shared/value";
import { createEnrolmentToken, type EnrolmentState } from "./enrolment";

const initialState: EnrolmentState = {};

/**
 * Emite el token y lo muestra **una sola vez**.
 *
 * No hay forma de volver a verlo: en la base solo queda el hash. Por eso la
 * pantalla lo dice antes de que el operador cierre la ventana, y entrega el
 * comando completo en vez del token suelto — lo que se pega en la máquina del
 * cliente es el comando.
 */
export function EnrolmentForm({
  tenantId,
  sites,
}: {
  tenantId: string;
  sites: Array<{ id: string; name: string; city: string }>;
}) {
  const [state, action, pending] = useActionState(createEnrolmentToken, initialState);

  return (
    <div className="space-y-4">
      <form action={action} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="tenant" value={tenantId} />
        <div className="min-w-44 flex-1">
          <label htmlFor="enrol-site" className="text-micro text-ink-soft">
            Sede
          </label>
          <select
            id="enrol-site"
            name="site"
            required
            className="mt-1 h-9 w-full rounded-control border border-line bg-paper px-2 text-small"
          >
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name} · {site.city}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-44 flex-1">
          <label htmlFor="enrol-label" className="text-micro text-ink-soft">
            Nombre del colector
          </label>
          <input
            id="enrol-label"
            name="label"
            placeholder="colector-bogota"
            className="mt-1 h-9 w-full rounded-control border border-line bg-paper px-3 text-small"
          />
        </div>
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          {pending ? "Emitiendo…" : "Emitir token"}
        </Button>
      </form>

      {state.error ? (
        <p role="alert" className="text-small text-critical">
          {state.error}
        </p>
      ) : null}

      {state.token ? (
        <div className="rounded-control border border-line bg-mist p-4">
          <p className="text-small font-medium">Cópialo ahora: no se vuelve a mostrar.</p>
          <p className="mt-1 text-micro text-ink-soft">
            Guardamos solo un hash, así que nadie —tampoco nosotros— puede recuperarlo. Vence en 24
            horas y sirve una sola vez.
          </p>
          <p className="mt-3 break-all rounded-control bg-paper px-3 py-2 text-small">
            <Value>{state.token}</Value>
          </p>
          <p className="mt-3 text-micro text-ink-soft">En la máquina del cliente:</p>
          <p className="mt-1 break-all rounded-control bg-paper px-3 py-2 text-micro">
            <Value>{state.command}</Value>
          </p>
        </div>
      ) : null}
    </div>
  );
}
