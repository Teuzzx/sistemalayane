/**
 * Papéis de acesso — funções puras, sem dependência de servidor.
 *
 * Este arquivo NÃO importa `server-only` nem `next/headers`, porque é
 * usado dentro de Client Components (a barra lateral). A lógica de
 * sessão vive em `lib/auth.ts`; aqui ficam só os rótulos e a comparação.
 */

import { papelAdmin, type Papel, type Usuario } from "@/db/schema";

export function ehAdmin(usuario: { papel: Papel } | null | undefined): boolean {
  return usuario?.papel === papelAdmin;
}

export function ehAssistente(
  usuario: { papel: Papel } | null | undefined,
): boolean {
  return usuario?.papel === "assistente";
}

/** Rótulo do papel para a UI. */
export function rotuloPapel(papel: Papel): string {
  return papel === papelAdmin ? "Administradora" : "Assistente";
}

/** Descrição curta do que cada papel pode fazer. */
export const descricaoPapeis: Record<Papel, string> = {
  admin: "Acesso total: clientes, financeiro, contratos, conformidade e configurações.",
  assistente:
    "Cadastra e edita clientes, registra atendimento, monta orçamento e dá baixa no financeiro. Não vê conformidade emitida nem configurações.",
};

export type { Usuario, Papel };