"use client";

import { useActionState } from "react";

import { Button } from "@/components/shared/button";
import { Value } from "@/components/shared/value";
import { createEnrolmentToken, type EnrolmentState } from "./enrolment";

const initialState: EnrolmentState = {};

/**
 * Alta de un colector, sin comandos.
 *
 * El botón entrega un instalador con el token ya dentro: el cliente lo ejecuta
 * y el asistente se abre en su navegador. No hay nada que copiar, y el token
 * —que se muestra una sola vez porque en la base solo queda un hash— viaja
 * dentro del archivo en vez de por un chat.
 */
export function EnrolmentForm({
  tenantId,
  sites,
}: {
  tenantId: string;
  sites: Array<{ id: string; name: string; city: string }>;
}) {
  const [state, action, pending] = useActionState(createEnrolmentToken, initialState);

  function download(content: string, filename: string) {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

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
        <Button type="submit" disabled={pending}>
          {pending ? "Preparando…" : "Agregar colector"}
        </Button>
      </form>

      {state.error ? (
        <p role="alert" className="text-small text-critical">
          {state.error}
        </p>
      ) : null}

      {state.installer ? (
        <div className="space-y-4 rounded-control border border-line bg-mist p-4">
          <div>
            <p className="text-small font-medium">Descarga el instalador y ejecútalo en la máquina del cliente.</p>
            <p className="mt-1 text-micro text-ink-soft">
              Ya trae el registro dentro. Al ejecutarlo se abre el asistente en el navegador de esa
              máquina para conectar el firewall. Vence en 24 horas y sirve una sola vez.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() =>
                download(state.installer!.windows, `${state.installer!.filename}.cmd`)
              }
            >
              Windows
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => download(state.installer!.linux, `${state.installer!.filename}.sh`)}
            >
              Linux
            </Button>
          </div>

          <details>
            <summary className="cursor-pointer text-micro text-ink-soft">
              Prefiero hacerlo por consola
            </summary>
            <p className="mt-2 break-all rounded-control bg-paper px-3 py-2 text-micro">
              <Value>{state.command}</Value>
            </p>
            <p className="mt-2 text-micro text-ink-soft">
              El colector se descarga de{" "}
              <Value>{`${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/v1/object/public/downloads/`}</Value>
            </p>
          </details>
        </div>
      ) : null}
    </div>
  );
}
