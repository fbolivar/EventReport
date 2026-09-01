"use client";

import { useActionState } from "react";

import { Button } from "@/components/shared/button";
import { inviteMember, type InviteState } from "./actions";

const initialState: InviteState = {};

export function InviteForm({ tenantId }: { tenantId: string }) {
  const [state, action, pending] = useActionState(inviteMember, initialState);

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="tenant" value={tenantId} />
      <div className="min-w-52 flex-1">
        <label htmlFor="invite-email" className="text-micro text-ink-soft">
          Correo
        </label>
        <input
          id="invite-email"
          name="email"
          type="email"
          required
          className="mt-1 h-9 w-full rounded-control border border-line bg-paper px-3 text-small"
        />
      </div>
      <div>
        <label htmlFor="invite-role" className="text-micro text-ink-soft">
          Acceso
        </label>
        <select
          id="invite-role"
          name="role"
          defaultValue="client_viewer"
          className="mt-1 h-9 rounded-control border border-line bg-paper px-2 text-small"
        >
          <option value="client_viewer">Lectura</option>
          <option value="client_admin">Administrador</option>
        </select>
      </div>
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "Invitando…" : "Invitar"}
      </Button>
      {state.error ? (
        <p role="alert" className="w-full text-small text-critical">
          {state.error}
        </p>
      ) : null}
      {state.ok ? <p className="w-full text-small text-ink-soft">{state.ok}</p> : null}
    </form>
  );
}
