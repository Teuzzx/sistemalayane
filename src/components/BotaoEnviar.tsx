"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Botão que entra em "processando…" sozinho enquanto o form sobe. */
export function BotaoEnviar({
  children,
  className,
  variante = "primario",
}: {
  children: ReactNode;
  className?: string;
  variante?: "primario" | "secundario" | "perigo";
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={cn("btn", `btn-${variante}`, className)}
    >
      {pending ? "Salvando…" : children}
    </button>
  );
}

/** Estado inicial da action — evita `useActionState` sem estado. */
export const estadoVazio = {} as const;