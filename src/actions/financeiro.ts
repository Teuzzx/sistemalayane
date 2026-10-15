"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import {
  auditoria,
  despesas,
  lancamentos,
  pagamentos,
  type FormaPagamento,
} from "@/db/schema";
import { requireUsuario } from "@/lib/auth";
import { hoje } from "@/lib/dates";
import { novoId } from "@/lib/ids";
import { paraCentavos } from "@/lib/money";

export type Estado = { erro?: string; ok?: string };

const opcional = z.string().trim().optional().or(z.literal(""));

const FORMAS = [
  "pix",
  "boleto",
  "transferencia",
  "dinheiro",
  "cartao_credito",
  "cartao_debito",
  "cheque",
  "outro",
] as const;

/* ------------------------------------------------------------------ */
/* Lançamentos —" o que tem a receber                                   */
/* ------------------------------------------------------------------ */

const esquemaLancamento = z.object({
  clienteId: z.string().min(1, "Selecione o cliente."),
  contratoId: opcional,
  descricao: z.string().trim().min(2, "Descreva o lançamento."),
  valor: z.string().min(1, "Informe o valor."),
  vencimento: z.string().min(1, "Informe o vencimento."),
  observacoes: opcional,
});

export async function salvarLancamento(
  _estado: Estado,
  formData: FormData,
): Promise<Estado> {
  const eu = await requireUsuario();
  const id = String(formData.get("id") ?? "");
  const clienteId = String(formData.get("clienteId") ?? "");

  const checado = esquemaLancamento.safeParse(Object.fromEntries(formData));
  if (!checado.success) {
    return { erro: checado.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const d = checado.data;

  const valor = paraCentavos(d.valor);
  if (valor === null || valor <= 0) {
    return { erro: "Informe um valor maior que zero." };
  }

  const valores = {
    clienteId,
    contratoId: d.contratoId || null,
    descricao: d.descricao,
    valor,
    vencimento: d.vencimento,
    observacoes: d.observacoes || null,
  };

  if (id) {
    // Não mexe em lançamento já pago —" o passado não se reescreve.
    const atual = await db.select().from(lancamentos).where(eq(lancamentos.id, id)).limit(1);
    if (atual[0]?.status === "pago") {
      return { erro: "Este lançamento já foi pago. Estorne a baixa antes de editar." };
    }
    await db.update(lancamentos).set(valores).where(eq(lancamentos.id, id));
  } else {
    await db.insert(lancamentos).values({
      id: novoId("lan"),
      criadoPor: eu.id,
      status: "pendente",
      ...valores,
    });
  }

  revalidatePath("/financeiro");
  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath("/painel");
  return { ok: id ? "Lançamento atualizado." : "Lançamento criado." };
}

/**
 * Baixa —" pagamento, desconto ou estorno.
 *
 * O desconto entra como valor NEGATIVO no histórico. — assim que o
 * "quanto eu dei de desconto" fica auditável sem perder o valor original
 * da cobrança: o cliente foi cobrado X, recebeu Y, o sistema guarda as
 * duas verdades.
 */
const esquemaBaixa = z.object({
  tipo: z.enum(["pagamento", "desconto", "estorno"]),
  valor: z.string().min(1, "Informe o valor."),
  data: z.string().min(1, "Informe a data."),
  formaPagamento: z.enum(FORMAS),
  observacoes: opcional,
});

export async function registrarBaixa(
  _estado: Estado,
  formData: FormData,
): Promise<Estado> {
  const eu = await requireUsuario();
  const lancamentoId = String(formData.get("lancamentoId") ?? "");
  if (!lancamentoId) return { erro: "Lançamento não encontrado." };

  const checado = esquemaBaixa.safeParse(Object.fromEntries(formData));
  if (!checado.success) {
    return { erro: checado.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const d = checado.data;

  const linhas = await db
    .select()
    .from(lancamentos)
    .where(eq(lancamentos.id, lancamentoId))
    .limit(1);
  const lanc = linhas[0];
  if (!lanc) return { erro: "Lançamento não encontrado." };

  if (lanc.status === "pago" && d.tipo !== "estorno") {
    return { erro: "Este lançamento já está quitado." };
  }
  if (lanc.status === "cancelado") {
    return { erro: "Este lançamento foi cancelado." };
  }

  const bruto = paraCentavos(d.valor);
  if (bruto === null || bruto <= 0) {
    return { erro: "Informe um valor maior que zero." };
  }

  // Desconto e estorno saem negativos; pagamento, positivo.
  const valor = d.tipo === "pagamento" ? bruto : -bruto;

  if (d.tipo === "desconto" && bruto > lanc.valor) {
    return { erro: "O desconto não pode ser maior que a cobrança." };
  }

  /* Baixas anteriores do mesmo lançamento —" o saldo é sempre a soma. */
  const baixas = await db
    .select({ valor: pagamentos.valor })
    .from(pagamentos)
    .where(eq(pagamentos.lancamentoId, lancamentoId));
  const jaMovimentado = baixas.reduce((a, b) => a + b.valor, 0);
  const saldo = lanc.valor - jaMovimentado;

  if (d.tipo === "pagamento" && valor > saldo) {
    return {
      erro: `Valor acima do saldo em aberto (${(saldo / 100).toFixed(2)}). Registre o restante como desconto.`,
    };
  }

  await db.insert(pagamentos).values({
    id: novoId("pag"),
    lancamentoId,
    clienteId: lanc.clienteId,
    data: d.data,
    valor,
    formaPagamento: d.formaPagamento as FormaPagamento,
    tipo: d.tipo,
    observacoes: d.observacoes || null,
    criadoPor: eu.id,
  });

  /* Reflete o novo saldo no lançamento. */
  const novoMovimentado = jaMovimentado + valor;
  const quitado = novoMovimentado >= lanc.valor;

  await db
    .update(lancamentos)
    .set({
      status: quitado ? "pago" : "pendente",
      pagoEm: quitado ? d.data : null,
      valorRecebido: quitado ? lanc.valor : novoMovimentado,
      formaPagamento: quitado ? d.formaPagamento : null,
      observacoes:
        d.observacoes ||
        (d.tipo === "desconto"
          ? `Desconto aplicado. Cobrado ${(lanc.valor / 100).toFixed(2)}, recebido ${((novoMovimentado) / 100).toFixed(2)}.`
          : lanc.observacoes),
    })
    .where(eq(lancamentos.id, lancamentoId));

  await db.insert(auditoria).values({
    id: novoId("aud"),
    usuarioId: eu.id,
    acao: d.tipo,
    entidade: "lancamento",
    entidadeId: lancamentoId,
    detalhe: `${(valor / 100).toFixed(2)} em ${d.data}`,
  });

  revalidatePath("/financeiro");
  revalidatePath(`/clientes/${lanc.clienteId}`);
  revalidatePath("/painel");

  const rotulos = { pagamento: "Baixa registrada", desconto: "Desconto aplicado", estorno: "Estorno registrado" };
  return { ok: `${rotulos[d.tipo]}.` };
}

/** Desfaz a última baixa de um lançamento (erro de digitação no caixa). */
export async function desfazerBaixa(formData: FormData): Promise<void> {
  const eu = await requireUsuario();
  const pagamentoId = String(formData.get("pagamentoId") ?? "");
  if (!pagamentoId) return;

  const linhas = await db
    .select()
    .from(pagamentos)
    .where(eq(pagamentos.id, pagamentoId))
    .limit(1);
  const pg = linhas[0];
  if (!pg) return;

  await db.delete(pagamentos).where(eq(pagamentos.id, pagamentoId));

  const restantes = await db
    .select({ valor: pagamentos.valor })
    .from(pagamentos)
    .where(eq(pagamentos.lancamentoId, pg.lancamentoId));
  const movimentado = restantes.reduce((a, b) => a + b.valor, 0);

  const lanc = await db
    .select()
    .from(lancamentos)
    .where(eq(lancamentos.id, pg.lancamentoId))
    .limit(1);
  const alvo = lanc[0];
  if (!alvo) return;

  await db
    .update(lancamentos)
    .set({
      status: alvo.status === "pago" && movimentado < alvo.valor ? "pendente" : alvo.status,
      pagoEm: null,
      valorRecebido: movimentado > 0 ? movimentado : 0,
      formaPagamento: null,
    })
    .where(eq(lancamentos.id, pg.lancamentoId));

  await db.insert(auditoria).values({
    id: novoId("aud"),
    usuarioId: eu.id,
    acao: "desfazer_baixa",
    entidade: "pagamento",
    entidadeId: pagamentoId,
    detalhe: alvo.descricao,
  });

  revalidatePath("/financeiro");
  revalidatePath(`/clientes/${pg.clienteId}`);
  revalidatePath("/painel");
}

export async function cancelarLancamento(formData: FormData): Promise<void> {
  const eu = await requireUsuario();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const linhas = await db.select().from(lancamentos).where(eq(lancamentos.id, id)).limit(1);
  const alvo = linhas[0];
  if (!alvo || alvo.status === "pago") return;

  await db
    .update(lancamentos)
    .set({ status: "cancelado" })
    .where(eq(lancamentos.id, id));

  revalidatePath("/financeiro");
  revalidatePath(`/clientes/${alvo.clienteId}`);
}

/* ------------------------------------------------------------------ */
/* Despesas                                                            */
/* ------------------------------------------------------------------ */

const esquemaDespesa = z.object({
  descricao: z.string().trim().min(2, "Descreva a despesa."),
  categoria: opcional,
  valor: z.string().min(1, "Informe o valor."),
  data: z.string().min(1, "Informe a data."),
  formaPagamento: z.enum(FORMAS),
  observacoes: opcional,
});

export async function salvarDespesa(
  _estado: Estado,
  formData: FormData,
): Promise<Estado> {
  await requireUsuario();

  const checado = esquemaDespesa.safeParse(Object.fromEntries(formData));
  if (!checado.success) {
    return { erro: checado.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const d = checado.data;

  const valor = paraCentavos(d.valor);
  if (valor === null || valor <= 0) {
    return { erro: "Informe um valor maior que zero." };
  }

  await db.insert(despesas).values({
    id: novoId("des"),
    descricao: d.descricao,
    categoria: d.categoria || null,
    valor,
    data: d.data,
    formaPagamento: d.formaPagamento as FormaPagamento,
    observacoes: d.observacoes || null,
  });

  revalidatePath("/financeiro");
  revalidatePath("/painel");
  return { ok: "Despesa registrada." };
}

export async function removerDespesa(formData: FormData): Promise<void> {
  await requireUsuario();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db.delete(despesas).where(eq(despesas.id, id));
  revalidatePath("/financeiro");
  revalidatePath("/painel");
}

/* ------------------------------------------------------------------ */
/* Fechamento de mês                                                   */
/* ------------------------------------------------------------------ */

/**
 * "Quanto eu faturei no ano" é uma pergunta que precisa de resposta
 * fechada. Este resumo é o número que vai para o contador.
 */
export async function resumoPeriodo(de: string, ate: string) {
  await requireUsuario();

  const movimento = await db.select().from(pagamentos);
  const gastos = await db.select().from(despesas);

  const noPeriodo = (data: string) => data >= de && data <= ate;

  const recebido = movimento
    .filter((p) => p.tipo === "pagamento" && noPeriodo(p.data))
    .reduce((a, p) => a + p.valor, 0);

  const descontos = Math.abs(
    movimento
      .filter((p) => p.tipo === "desconto" && noPeriodo(p.data))
      .reduce((a, p) => a + p.valor, 0),
  );

  const despesasPeriodo = gastos
    .filter((d) => noPeriodo(d.data))
    .reduce((a, d) => a + d.valor, 0);

  return {
    recebido,
    descontos,
    liquido: recebido - descontos,
    despesas: despesasPeriodo,
    resultado: recebido - descontos - despesasPeriodo,
  };
}