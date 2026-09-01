"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/shared/button";
import { createTenant, type NewTenantState } from "./actions";

const initialState: NewTenantState = {};

/** El identificador va en la dirección del portal: se propone desde el nombre. */
const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

/**
 * Alta de un cliente nuevo.
 *
 * Vive en la vista de clientes porque es donde el proveedor mira su cartera. Al
 * crearla lleva directo a los Ajustes de esa empresa: lo siguiente siempre es
 * instalar el colector, y hacer que lo busque es hacerle perder el tiempo.
 */
export function NewTenant() {
  const [state, action, pending] = useActionState(createTenant, initialState);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        Agregar cliente
      </Button>
    );
  }

  return (
    <form action={action} className="w-full max-w-2xl space-y-3 rounded-control border border-line bg-paper p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="tenant-name" className="text-micro text-ink-soft">
            Nombre de la empresa
          </label>
          <input
            id="tenant-name"
            name="name"
            required
            autoFocus
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setSlug(slugify(event.target.value));
            }}
            placeholder="Distribuidora del Norte S.A.S."
            className="mt-1 h-9 w-full rounded-control border border-line bg-paper px-3 text-small"
          />
        </div>

        <div>
          <label htmlFor="tenant-slug" className="text-micro text-ink-soft">
            Identificador en la dirección
          </label>
          <input
            id="tenant-slug"
            name="slug"
            required
            value={slug}
            onChange={(event) => setSlug(slugify(event.target.value))}
            className="mt-1 h-9 w-full rounded-control border border-line bg-paper px-3 text-small"
          />
          <p className="mt-1 text-micro text-ink-soft">
            eventreport.vercel.app/{slug || "empresa"}/dashboard
          </p>
        </div>

        <div>
          <label htmlFor="tenant-city" className="text-micro text-ink-soft">
            Ciudad de la sede principal
          </label>
          <input
            id="tenant-city"
            name="city"
            placeholder="Bogotá"
            className="mt-1 h-9 w-full rounded-control border border-line bg-paper px-3 text-small"
          />
        </div>

        <div>
          <label htmlFor="tenant-plan" className="text-micro text-ink-soft">
            Plan
          </label>
          <select
            id="tenant-plan"
            name="plan"
            defaultValue="standard"
            className="mt-1 h-9 w-full rounded-control border border-line bg-paper px-2 text-small"
          >
            <option value="basic">Básico · 1 firewall</option>
            <option value="standard">Estándar · 3 firewalls</option>
            <option value="premium">Premium · 10 firewalls</option>
          </select>
        </div>
      </div>

      {state.error ? (
        <p role="alert" className="text-small text-critical">
          {state.error}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Creando…" : "Crear cliente"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
