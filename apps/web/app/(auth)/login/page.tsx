import type { Metadata } from "next";

import { Logo } from "@/components/shared/logo";
import { login as copy } from "@/content/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <Logo />
          <h1 className="mt-10 text-h1 text-balance">{copy.title}</h1>
          <p className="mt-3 text-small text-ink-soft">{copy.subtitle}</p>

          <LoginForm next={next ?? ""} />

          <p className="mt-6 text-small text-ink-soft">{copy.noAccount}</p>
        </div>
      </div>

      <div className="hidden bg-ink lg:block" />
    </main>
  );
}
