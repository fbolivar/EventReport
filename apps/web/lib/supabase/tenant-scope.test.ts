import assert from "node:assert/strict";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";

import { tenantScoped } from "./tenant-scope.ts";

/**
 * El generador programado corre con la clave de servicio, que ignora RLS. Lo
 * único que separa a un cliente de otro es este proxy, así que se prueba solo:
 * si alguien lo rompe, dos clientes distintos reciben el mismo informe.
 */
const TENANT = "a0000000-0000-4000-8000-000000000001";
const OTHER = "b0000000-0000-4000-8000-000000000002";

const client = createClient("https://example.supabase.co", "clave-de-prueba");
const scoped = tenantScoped(client, TENANT);

/** PostgREST arma la URL antes de ejecutar: ahí se ve el filtro. */
const query = (builder: unknown) => (builder as { url: URL }).url.toString();

test("una tabla del tenant se filtra por tenant_id", () => {
  const url = query(scoped.from("findings").select("id"));
  assert.ok(url.includes(`tenant_id=eq.${TENANT}`), url);
  assert.ok(!url.includes(OTHER));
});

test("la tabla de tenants se filtra por su propia clave", () => {
  const url = query(scoped.from("tenants").select("id, slug"));
  assert.ok(url.includes(`id=eq.${TENANT}`), url);
  assert.ok(!url.includes("tenant_id"), url);
});

test("las tablas de catálogo no se filtran: son iguales para todos", () => {
  const url = query(scoped.from("finding_rules").select("code"));
  assert.ok(!url.includes("tenant_id"), url);
});

test("el filtro se mantiene aunque la consulta agregue condiciones", () => {
  const url = query(scoped.from("findings").select("id").eq("status", "open"));
  assert.ok(url.includes(`tenant_id=eq.${TENANT}`), url);
  assert.ok(url.includes("status=eq.open"), url);
});

test("el cliente sin acotar no lleva filtro: la diferencia es el proxy", () => {
  const url = query(client.from("findings").select("id"));
  assert.ok(!url.includes("tenant_id"), url);
});
