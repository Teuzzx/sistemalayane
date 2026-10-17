/**
 * Permissões por seção.
 *
 * Papel continua existindo — `admin` é a Layane e tem tudo, sempre. O
 * que este arquivo acrescenta é o recorte do `assistente`: em vez de
 * "assistente pode tudo menos X", a Layane marca seção por seção o que
 * aquela pessoa pode usar.
 *
 * Duas regras que valem para o arquivo inteiro:
 *
 * 1. **Esconder o link não é permissão.** A lateral filtra a lista, mas
 *    quem decide é `exigir()`, chamada no servidor no topo de cada
 *    página. Sem isso, trocar `/clientes` por `/financeiro` na URL
 *    abria a tela — foi exatamente assim que a tela de configurações
 *    ficou exposta antes de ela virar item visível de todos.
 *
 * 2. **Este módulo não importa `server-only`.** A lateral precisa dele
 *    dentro de Client Components, então é código puro.
 */

import { papelAdmin, type Papel, type Usuario } from "@/db/schema";

/** Uma seção do sistema. O valor é o que vai no banco. */
export type Secao =
  | "clientes"
  | "demandas"
  | "documentos"
  | "orcamentos"
  | "contratos"
  | "financeiro"
  | "mensagens"
  | "conformidade";

/** Todas as seções, na ordem em que aparecem na lateral. */
export const SECOES: readonly Secao[] = [
  "clientes",
  "demandas",
  "documentos",
  "orcamentos",
  "contratos",
  "financeiro",
  "mensagens",
  "conformidade",
];

/** Nome que a Layane lê na tela de permissões. */
export const ROTULO_SECAO: Record<Secao, string> = {
  clientes: "Clientes",
  demandas: "Demandas",
  documentos: "Documentos",
  orcamentos: "Orçamentos",
  contratos: "Contratos",
  financeiro: "Financeiro",
  mensagens: "Mensagens",
  conformidade: "Conformidade",
};

/** Uma linha de explicação por seção — o "por que serve", não o "o que é". */
export const RESUMO_SECAO: Record<Secao, string> = {
  clientes: "Cadastro, histórico e ficha de cada cliente.",
  demandas: "O funil: do primeiro contato ao contrato.",
  documentos: "Licenças, autorizações e prazos de validade.",
  orcamentos: "Propostas enviadas e o que virou contrato.",
  contratos: "O que está firmado e a vigência de cada um.",
  financeiro: "A receber, atrasado, despesas e resultado.",
  mensagens: "Cobrança, contrato e aviso — o que foi enviado.",
  conformidade: "Diagnóstico, questionário e parecer técnico.",
};

/**
 * O que um assistente novo começa com.
 *
 * O desenho segue quem entra pela primeira vez: quem já cadastra cliente
 * e dá baixa no financeiro. Quem é contratado só para outra coisa — só
 * mensagens, só documentos — a Layane desliga o resto na hora em que cria
 * o acesso.
 */
export const PADRAO_ASSISTENTE: readonly Secao[] = [
  "clientes",
  "demandas",
  "documentos",
  "orcamentos",
  "financeiro",
  "mensagens",
];

/**
 * Converte o que veio do banco numa lista de seções válidas.
 *
 * Entrada comes de duas места que não merecem confiança: o banco (pode
 * ter sido editado na mão) e o formulário (pode vir `on` de checkbox não
 * marcado). Tudo fora da lista é descartado em vez de gerar erro.
 */
export function secoesDoUsuario(
  usuario: { papel: Papel; permissoes?: string[] | null } | null | undefined,
): Secao[] {
  if (!usuario) return [];
  if (usuario.papel === papelAdmin) return [...SECOES];

  const cru = Array.isArray(usuario.permissoes) ? usuario.permissoes : [];
  return SECOES.filter((s) => cru.includes(s));
}

/** Esta pessoa entra nesta seção? */
export function podeAcessar(
  usuario: { papel: Papel; permissoes?: string[] | null } | null | undefined,
  secao: Secao,
): boolean {
  return secoesDoUsuario(usuario).includes(secao);
}

/**
 * A lateral e os botões usam só `podeAcessar`. A decisão real acontece no
 * servidor, em `exigirPermissao`, que redireciona — esconder o link não
 * protege nada.
 */
export { ehAdmin, ehAssistente, rotuloPapel } from "@/lib/papeis";
export type { Usuario, Papel };