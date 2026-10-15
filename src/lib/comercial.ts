/**
 * Regras comerciais compartilhadas por orçamento, contrato e financeiro.
 *
 * Ponto central: **o total nunca vem do formulário**. O navegador manda
 * a lista de itens; o servidor refaz a conta. Se alguém editar o HTML
 * ou chamar a action na mão, o número não muda.
 */

import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { lancamentos, type Lancamento, type OrcamentoItem } from "@/db/schema";
import { hoje, somaDias } from "@/lib/dates";
import { paraCentavos } from "@/lib/money";

/** Refaz subtotal, descontos e total de um orçamento. */
export function calcularTotais(
  itens: OrcamentoItem[],
  descontoPercentual = 0,
  descontoValor = 0,
) {
  const limpo = itens
    .filter((i) => (i.descricao ?? "").trim() !== "")
    .map((i) => ({
      descricao: i.descricao.trim(),
      quantidade: Math.max(0, Number(i.quantidade) || 0),
      valorUnitario: Math.max(0, Math.round(Number(i.valorUnitario) || 0)),
    }));

  const subtotal = limpo.reduce(
    (acc, i) => acc + i.quantidade * i.valorUnitario,
    0,
  );

  const percentual = Math.min(100, Math.max(0, descontoPercentual || 0));
  const descontoPctValor = Math.round((subtotal * percentual) / 100);
  const descontoFixo = Math.max(0, descontoValor || 0);

  // O desconto nunca passa do subtotal.
  const descontoTotal = Math.min(subtotal, descontoPctValor + descontoFixo);
  const total = Math.max(0, subtotal - descontoTotal);

  return { itens: limpo, subtotal, descontoTotal, descontoPercentual: percentual, descontoValor: descontoTotal, total };
}

/**
 * Lê os itens do formulário.
 *
 * Vem como campos `item_descricao`, `item_qtd`, `item_valor` em pares —
 * é o que dá pra fazer com `FormData` sem biblioteca de estado no cliente.
 */
export function lerItens(formData: FormData): OrcamentoItem[] {
  const descricoes = formData.getAll("item_descricao").map(String);
  const quantidades = formData.getAll("item_qtd").map(String);
  const valores = formData.getAll("item_valor").map(String);

  return descricoes.map((descricao, i) => ({
    descricao,
    quantidade: Number(quantidades[i] ?? 0) || 0,
    valorUnitario: paraCentavos(valores[i] ?? "") ?? 0,
  }));
}

/** Número de parcelas: joga o resto na primeira (evita parcela de R$ 0,03). */
export function repartir(total: number, parcelas: number): number[] {
  const n = Math.max(1, Math.floor(parcelas));
  const base = Math.floor(total / n);
  const resto = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i === 0 ? resto : 0));
}

/** Valores que o `gerarCronograma` devolve — ainda não gravados. */
export type ParcelaGerada = {
  id: string;
  clienteId: string;
  contratoId: string;
  descricao: string;
  valor: number;
  vencimento: string;
  status: "pendente";
  criadoPor: string;
};

/**
 * Gera o cronograma de cobrança de um contrato.
 *
 * Duas modalidades:
 * - `pro_rata`: parcelas iguais em intervalo regular.
 * - `entrada`: a primeira é a entrada (30% do total, paga na assinatura);
 *   as demais dividem o restante. É como a maior parte dos contratos de
 *   consultoria funciona — a entrada trava o escopo, o resto acompanha.
 *
 * Em ambos os casos a primeira parcela vence na data de início do
 * contrato, e nenhuma parcela nasce com valor zero.
 */
export function gerarCronograma(opts: {
  contratoId: string;
  clienteId: string;
  valorTotal: number;
  parcelas: number;
  intervaloDias: number;
  inicio: string;
  descricaoBase: string;
  autorId: string;
  forma?: "pro_rata" | "entrada";
  /** Percentual da entrada quando `forma === "entrada"`. */
  entradaPercentual?: number;
}): ParcelaGerada[] {
  const {
    contratoId,
    clienteId,
    valorTotal,
    parcelas,
    intervaloDias,
    inicio,
    descricaoBase,
    autorId,
    forma = "pro_rata",
    entradaPercentual = 30,
  } = opts;

  const n = Math.max(1, Math.floor(parcelas));

  let valores: number[];

  if (forma === "entrada" && n > 1) {
    const entrada = Math.round((valorTotal * entradaPercentual) / 100);
    const resto = Math.max(0, valorTotal - entrada);
    valores = [entrada, ...repartir(resto, n - 1)];
  } else {
    valores = repartir(valorTotal, n);
  }

  // Sanidade: a soma tem de fechar com o total. Arredondamento de
  // centavo não pode criar nem sumir dinheiro.
  const soma = valores.reduce((a, b) => a + b, 0);
  valores[valores.length - 1] += valorTotal - soma;

  return valores
    .filter((v) => v > 0)
    .map((valor, i) => ({
      id: `lan_${contratoId}_${i + 1}`,
      clienteId,
      contratoId,
      descricao: `${descricaoBase} — parcela ${i + 1}/${valores.length}`,
      valor,
      vencimento: somaDias(inicio, i * intervaloDias),
      status: "pendente" as const,
      criadoPor: autorId,
    }));
}

/**
 * Uma linha vencida continua `pendente` no banco — é o filtro por status
 * que decide se ela é "a receber" ou "atrasada". Assim o histórico não
 * depende de rotina noturna para lembrar o que passou do prazo.
 */
export function ehAtrasado(l: Pick<Lancamento, "status" | "vencimento">): boolean {
  return l.status === "pendente" && !!l.vencimento && l.vencimento < hoje();
}

/** Conta o que está aberto de um contrato. */
export async function abertoDoContrato(contratoId: string) {
  const linhas = await db
    .select()
    .from(lancamentos)
    .where(eq(lancamentos.contratoId, contratoId));
  return linhas
    .filter((l) => l.status === "pendente" || l.status === "atrasado")
    .reduce((a, l) => a + l.valor, 0);
}