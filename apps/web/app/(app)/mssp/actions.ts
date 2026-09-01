"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PlanCode } from "@eventreport/schema";

import { createClient } from "@/lib/supabase/server";

export interface NewTenantState {
  error?: string;
}

/**
 * Da de alta un cliente.
 *
 * Toda la creación vive en una función de la base (`create_tenant`): la empresa,
 * la membresía de quien la crea, los cupos del plan y la primera sede. Hacerlo
 * desde aquí en cuatro pasos dejaría empresas a medio crear cada vez que uno
 * falle, y una empresa sin cupos rechaza la primera ingesta sin que nadie
 * entienda por qué.
 */
export async function createTenant(
  _previous: NewTenantState,
  formData: FormData,
): Promise<NewTenantState> {
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const plan = String(formData.get("plan") ?? "basic") as PlanCode;
  const city = String(formData.get("city") ?? "").trim();

  if (!name) return { error: "Escribe el nombre de la empresa." };
  if (!slug) return { error: "Escribe el identificador que irá en la dirección." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_tenant", {
    p_name: name,
    p_slug: slug,
    p_plan: plan,
    p_site: "Sede principal",
    p_city: city,
  });

  if (error) {
    if (error.message.includes("duplicate key")) {
      return { error: "Ya existe una empresa con ese identificador." };
    }
    if (error.message.includes("administrador MSSP")) {
      return { error: "Tu cuenta no administra empresas: pide acceso de MSSP." };
    }
    return { error: "No pudimos crear la empresa." };
  }

  void data;
  revalidatePath("/mssp");
  redirect(`/${slug.toLowerCase()}/settings`);
}
