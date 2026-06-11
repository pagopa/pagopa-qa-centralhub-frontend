"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

function LoginCard() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div
      className="flex flex-col items-center gap-6 rounded-[var(--radius)] border border-border bg-surface p-8"
      style={{ width: 360 }}
    >
      <div className="flex flex-col items-center gap-3">
        <div
          className="grid place-items-center rounded-[7px] bg-text text-bg font-mono font-semibold"
          style={{ width: 40, height: 40, fontSize: 16 }}
        >
          QA
        </div>
        <div className="text-lg font-semibold text-text">QA Hub</div>
      </div>

      {error === "AccessDenied" && (
        <p className="text-[13px] text-danger text-center">
          Il tuo account è in attesa di attivazione. Contatta un amministratore.
        </p>
      )}

      <button
        onClick={() => signIn("google", { callbackUrl: "/" })}
        className="w-full rounded-[var(--radius-sm)] bg-accent text-accent-fg text-[13px] px-4 py-2 hover:opacity-90 transition-opacity"
      >
        Accedi con Google
      </button>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="h-screen w-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <Suspense fallback={null}>
        <LoginCard />
      </Suspense>
    </div>
  );
}
