"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

/**
 * Botão de Server Action com estado de "processando".
 * Usado nos botões de status (mover demanda, mudar etapa, etc).
 */
export function FormStatus({
  acao,
  campos,
  rotulo,
  ativo,
  variante = "secundario",
  children,
}: {
  acao: (formData: FormData) => Promise<void>;
  campos: Record<string, string>;
  rotulo?: string;
  ativo?: boolean;
  variante?: "primario" | "secundario" | "perigo";
  children?: ReactNode;
}) {
  return (
    <form action={acao}>
      {Object.entries(campos).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <BotaoStatus rotulo={rotulo} ativo={ativo} variante={variante}>
        {children}
      </BotaoStatus>
    </form>
  );
}

function BotaoStatus({
  rotulo,
  ativo,
  variante,
  children,
}: {
  rotulo?: string;
  ativo?: boolean;
  variante: "primario" | "secundario" | "perigo";
  children?: ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || ativo}
      className={`btn btn-${variante}${ativo ? " opacity-100 ring-1 ring-deep" : ""}`}
    >
      {pending ? "…" : (children ?? rotulo)}
    </button>
  );
}