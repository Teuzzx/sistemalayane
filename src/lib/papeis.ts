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

/**
 * O que a camada de proteção faz, em português claro.
 *
 * Fica aqui, e não dentro do componente, porque é conteúdo editorial que
 * a Layane lê — não dado. E fica num módulo sem `server-only`, para o
 * texto poder ser usado também na tela de login.
 */
export const PANEL_SEGURANCA_NOTAS: string[] = [
  "Senha guardada com hash bcrypt de custo 12 — o sistema não sabe a sua senha, só sabe que confere.",
  "Após 5 tentativas com senha errada, o acesso é bloqueado por 15 minutos.",
  "20 tentativas vindas do mesmo endereço de rede também bloqueiam.",
  "E-mail inexistente e senha errada devolvem a mesma resposta, no mesmo tempo.",
  "Cookie de sessão httpOnly: o navegador guarda o token, o JavaScript da página não consegue ler.",
  "Cabeçalhos que impedem o sistema de ser embedado em página falsa (clickjacking).",
  "Cada consulta de tela é revalidada no servidor — editar o HTML não muda total, preço nem saldo.",
];

export type { Usuario, Papel };