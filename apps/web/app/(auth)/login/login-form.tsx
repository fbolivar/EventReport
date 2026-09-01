"use client";

import { useActionState } from "react";

import { Button } from "@/components/shared/button";
import { login as copy } from "@/content/auth";
import { signInAction, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signInAction, initialState);

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <input type="hidden" name="next" value={next} />

      <div>
        <label htmlFor="email" className="text-micro text-ink-soft">
          {copy.emailLabel}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-1 h-10 w-full rounded-control border border-line bg-paper px-3 text-small"
        />
      </div>

      <div>
        <label htmlFor="password" className="text-micro text-ink-soft">
          {copy.passwordLabel}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1 h-10 w-full rounded-control border border-line bg-paper px-3 text-small"
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-small text-critical">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? copy.submitting : copy.submit}
      </Button>
    </form>
  );
}
