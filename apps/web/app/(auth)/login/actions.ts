"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { login as copy } from "@/content/auth";
import { createClient } from "@/lib/supabase/server";
import { firstTenantSlug } from "@/lib/data/tenant";

export interface LoginState {
  error?: string;
}

/**
 * Sign in with email and password. The destination is resolved from the user's
 * membership, never from the form: a crafted `next` cannot take anyone into a
 * tenant they do not belong to, and RLS would block the data anyway.
 */
export async function signInAction(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return {
      error: error.status === 400 ? copy.errors.invalid : copy.errors.unexpected,
    };
  }

  const slug = await firstTenantSlug();
  if (!slug) return { error: copy.errors.noTenant };

  const target = next.startsWith(`/${slug}/`) || next === "/mssp" ? next : `/${slug}/dashboard`;

  revalidatePath("/", "layout");
  redirect(target);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
