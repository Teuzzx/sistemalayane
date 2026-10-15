"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import {
  auditoria,
  contratos,
  demandas,
  lancamentos,
  orcamentos,
} from "@/db/schema";
import { requireUsuario } from "@/lib/auth";
import {
  calcularTotais,
  gerarCronograma,
  lerItens,
} from "@/lib/comercial";
import { proximoNumero } from "@/lib/consultas";
import { hoje, somaDias } from "@/lib/dates";
import { novoId } from "@/lib/ids";
import { paraCentavos } from "@/lib/money";

export type Estado = { erro?: string; ok?: string };

const opcional = z.string().trim().optional().or(z.literal(""));
const nulo = (v?: string) => (v && v.trim() ? v.trim() : null);

/* ------------------------------------------------------------------ */
/* Orçamentos                                                          */
/* ------------------------------------------------------------------ */

const esquemaOrcamento = z.object({
  clienteId: z.string().min(1, "Selecione o cliente."),
  demandaId: opcional,
  titulo: z.string().trim().min(3, "Dê um título ao orçamento."),
  condicaoPagamento: opcional,
  prazoEntrega: opcional,
  validadeDias: z.coerce.number().int().min(1).max(365).default(15),
  observacoes: opcional,
});

export async function salvarOrcamento(
  _estado: Estado,
  formData: FormData,
): Promise<Estado> {
  const eu = await requireUsuario();
  const id = String(formData.get("id") ?? "");
  const clienteId = String(formData.get("clienteId") ?? "");

  const checado = esquemaOrcamento.safeParse(Object.fromEntries(formData));
  if (!checado.success) {
    return { erro: checado.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const d = checado.data;

  // O total é recalculado aqui. O que veio do formulário é só insumo.
  const totais = calcularTotais(
    lerItens(formData),
    Number(formData.get("descontoPercentual") ?? 0) || 0,
    paraCentavos(String(formData.get("descontoValor") ?? "")) ?? 0,
  );

  if (totais.itens.length === 0) {
    return { erro: "Inclua pelo menos um item no orçamento." };
  }

  const valores = {
    clienteId,
    demandaId: nulo(d.demandaId),
    titulo: d.titulo,
    itens: totais.itens,
    subtotal: totais.subtotal,
    descontoValor: totais.descontoValor,
    descontoPercentual: totais.descontoPercentual,
    total: totais.total,
    condicaoPagamento: nulo(d.condicaoPagamento),
    prazoEntrega: nulo(d.prazoEntrega),
    validadeDias: d.validadeDias,
    observacoes: nulo(d.observacoes),
    atualizadoEm: new Date().toISOString(),
  };

  if (id) {
    await db.update(orcamentos).set(valores).where(eq(orcamentos.id, id));
    revalidatePath(`/orcamentos/${id}`);
    revalidatePath("/orcamentos");
    return { ok: "Orçamento atualizado." };
  }

  const numero = await proximoNumero(orcamentos, "ORC");
  const novo = novoId("orc");

  await db.insert(orcamentos).values({
    id: novo,
    numero,
    criadoPor: eu.id,
    ...valores,
    validoAte: somaDias(hoje(), d.validadeDias),
    status: "rascunho",
  });

  await db.insert(auditoria).values({
    id: novoId("aud"),
    usuarioId: eu.id,
    acao: "criar",
    entidade: "orcamento",
    entidadeId: novo,
    detalhe: `${numero} —" ${valores.titulo}`,
  });

  revalidatePath("/orcamentos");
  return { ok: `${numero} criado.` };
}

export async function mudarStatusOrcamento(formData: FormData): Promise<void> {
  await requireUsuario();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !status) return;

  const agora = new Date().toISOString();
  const valores: Record<string, unknown> = { status, atualizadoEm: agora };

  if (status === "enviado") valores.enviadoEm = agora;
  if (status === "aprovado") valores.aprovadoEm = agora;

  await db.update(orcamentos).set(valores).where(eq(orcamentos.id, id));

  const linhas = await db
    .select({ clienteId: orcamentos.clienteId })
    .from(orcamentos)
    .where(eq(orcamentos.id, id))
    .limit(1);

  revalidatePath("/orcamentos");
  if (linhas[0]) revalidatePath(`/clientes/${linhas[0].clienteId}`);
}

/**
 * Aprova e transforma o orçamento em contrato —" o caminho que a Layane
 * descreveu: "faço o estudo, quero fechar um contrato de seis meses".
 */
export async function converterEmContrato(
  _estado: Estado,
  formData: FormData,
): Promise<Estado> {
  const eu = await requireUsuario();
  const orcamentoId = String(formData.get("orcamentoId") ?? "");
  if (!orcamentoId) return { erro: "Orçamento não encontrado." };

  const linhas = await db
    .select()
    .from(orcamentos)
    .where(eq(orcamentos.id, orcamentoId))
    .limit(1);
  const orc = linhas[0];
  if (!orc) return { erro: "Orçamento não encontrado." };

  if (orc.status === "convertido") {
    const jaExiste = await db
      .select({ id: contratos.id })
      .from(contratos)
      .where(eq(contratos.orcamentoId, orcamentoId))
      .limit(1);
    if (jaExiste[0]) return { erro: "Este orçamento já virou contrato." };
  }

  const inicio = String(formData.get("inicio") ?? "") || hoje();
  const parcelas = Math.max(1, Number(formData.get("parcelas") ?? 1) || 1);
  const intervalo = Math.max(1, Number(formData.get("intervalo") ?? 30) || 30);
  const forma = formData.get("forma") === "entrada" ? "entrada" : "pro_rata";
  const escopo = String(formData.get("escopo") ?? orc.observacoes ?? "").trim();

  const numero = await proximoNumero(contratos, "CT");
  const contratoId = novoId("ctr");

  await db.insert(contratos).values({
    id: contratoId,
    clienteId: orc.clienteId,
    orcamentoId: orc.id,
    demandaId: orc.demandaId,
    numero,
    titulo: orc.titulo,
    status: "ativo",
    inicio,
    fim: null,
    valorTotal: orc.total,
    formaPagamento: orc.condicaoPagamento,
    parcelas,
    intervaloParcelasDias: intervalo,
    escopo: escopo || null,
    formaDePagamentoTexto: orc.condicaoPagamento,
    criadoPor: eu.id,
  });

  // O cronograma nasce junto. A Layane não precisa "cadastrar as
  // parcelas" depois —" elas já estão lá, com vencimento e tudo.
  const plano = gerarCronograma({
    contratoId,
    clienteId: orc.clienteId,
    valorTotal: orc.total,
    parcelas,
    intervaloDias: intervalo,
    inicio,
    descricaoBase: orc.titulo,
    autorId: eu.id,
    forma,
  });

  if (plano.length) await db.insert(lancamentos).values(plano);

  await db
    .update(orcamentos)
    .set({ status: "convertido", atualizadoEm: new Date().toISOString() })
    .where(eq(orcamentos.id, orcamentoId));

  // Se veio de uma demanda, ela avança junto —" o funil não mente.
  if (orc.demandaId) {
    await db
      .update(demandas)
      .set({ status: "em_andamento", atualizadoEm: new Date().toISOString() })
      .where(eq(demandas.id, orc.demandaId));
  }

  await db.insert(auditoria).values({
    id: novoId("aud"),
    usuarioId: eu.id,
    acao: "converter",
    entidade: "orcamento",
    entidadeId: orcamentoId,
    detalhe: `u{2192} contrato ${numero}`,
  });

  revalidatePath("/orcamentos");
  revalidatePath("/contratos");
  revalidatePath("/financeiro");
  revalidatePath(`/clientes/${orc.clienteId}`);

  return { ok: `${numero} criado com ${plano.length} parcelas.` };
}

/* ------------------------------------------------------------------ */
/* Contratos                                                           */
/* ------------------------------------------------------------------ */

const esquemaContrato = z.object({
  clienteId: z.string().min(1, "Selecione o cliente."),
  titulo: z.string().trim().min(3, "Dê um título ao contrato."),
  inicio: z.string().min(1, "Informe a data de início."),
  fim: opcional,
  valorTotal: z.string().min(1, "Informe o valor."),
  formaPagamento: opcional,
  parcelas: z.coerce.number().int().min(1).max(60).default(1),
  intervaloParcelasDias: z.coerce.number().int().min(1).max(180).default(30),
  escopo: opcional,
  investimento: opcional,
  formaDePagamentoTexto: opcional,
  obrigacoes: opcional,
  confidencialidade: opcional,
  rescisao: opcional,
  observacoes: opcional,
  gerarParcelas: z.coerce.boolean().default(false),
  formaCronograma: z.enum(["pro_rata", "entrada"]).default("pro_rata"),
});

export async function salvarContrato(
  _estado: Estado,
  formData: FormData,
): Promise<Estado> {
  const eu = await requireUsuario();
  const id = String(formData.get("id") ?? "");

  const checado = esquemaContrato.safeParse(Object.fromEntries(formData));
  if (!checado.success) {
    return { erro: checado.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const d = checado.data;

  const valorTotal = paraCentavos(d.valorTotal);
  if (valorTotal === null || valorTotal <= 0) {
    return { erro: "Informe um valor válido para o contrato." };
  }

  const valores = {
    clienteId: d.clienteId,
    titulo: d.titulo,
    inicio: d.inicio,
    fim: d.fim || null,
    valorTotal,
    formaPagamento: d.formaPagamento || null,
    parcelas: d.parcelas,
    intervaloParcelasDias: d.intervaloParcelasDias,
    escopo: d.escopo || null,
    investimento: d.investimento || null,
    formaDePagamentoTexto: d.formaDePagamentoTexto || null,
    obrigacoes: d.obrigacoes || null,
    confidencialidade: d.confidencialidade || null,
    rescisao: d.rescisao || null,
    observacoes: d.observacoes || null,
    atualizadoEm: new Date().toISOString(),
  };

  let contratoId = id;

  if (id) {
    await db.update(contratos).set(valores).where(eq(contratos.id, id));
  } else {
    const numero = await proximoNumero(contratos, "CT");
    contratoId = novoId("ctr");
    await db.insert(contratos).values({
      id: contratoId,
      numero,
      status: "rascunho",
      criadoPor: eu.id,
      ...valores,
    });
  }

  /* Cronograma: só geramos quando não existe parcela lançamento ainda.
     Re-salvar um contrato não duplica cobrança. */
  if (d.gerarParcelas) {
    const existentes = await db
      .select({ id: lancamentos.id })
      .from(lancamentos)
      .where(eq(lancamentos.contratoId, contratoId))
      .limit(1);

    if (!existentes.length) {
      const plano = gerarCronograma({
        contratoId,
        clienteId: d.clienteId,
        valorTotal,
        parcelas: d.parcelas,
        intervaloDias: d.intervaloParcelasDias,
        inicio: d.inicio,
        descricaoBase: d.titulo,
        autorId: eu.id,
        forma: d.formaCronograma,
      });
      if (plano.length) await db.insert(lancamentos).values(plano);
    }
  }

  await db.insert(auditoria).values({
    id: novoId("aud"),
    usuarioId: eu.id,
    acao: id ? "editar" : "criar",
    entidade: "contrato",
    entidadeId: contratoId,
    detalhe: valores.titulo,
  });

  revalidatePath("/contratos");
  revalidatePath(`/contratos/${contratoId}`);
  revalidatePath("/financeiro");
  revalidatePath(`/clientes/${d.clienteId}`);

  return { ok: id ? "Contrato atualizado." : "Contrato criado." };
}

export async function mudarStatusContrato(formData: FormData): Promise<void> {
  await requireUsuario();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !status) return;

  await db
    .update(contratos)
    .set({
      status: status as never,
      assinadoEm: status === "assinado" ? hoje() : undefined,
      atualizadoEm: new Date().toISOString(),
    })
    .where(eq(contratos.id, id));

  revalidatePath("/contratos");
  revalidatePath(`/contratos/${id}`);
}

/** Encerra o contrato e cancela o que ainda estava por receber. */
export async function encerrarContrato(formData: FormData): Promise<void> {
  await requireUsuario();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const linhas = await db.select().from(contratos).where(eq(contratos.id, id)).limit(1);
  const contrato = linhas[0];
  if (!contrato) return;

  const motivo = String(formData.get("motivo") ?? "").trim();

  await db
    .update(contratos)
    .set({
      status: "encerrado",
      fim: contrato.fim ?? hoje(),
      observacoes: [contrato.observacoes, motivo && `Encerramento: ${motivo}`]
        .filter(Boolean)
        .join("\n\n") || null,
      atualizadoEm: new Date().toISOString(),
    })
    .where(eq(contratos.id, id));

  await db
    .update(lancamentos)
    .set({
      status: "cancelado",
      observacoes: "Cancelado por encerramento do contrato.",
    })
    .where(
      and(
        eq(lancamentos.contratoId, id),
        inArray(lancamentos.status, ["pendente", "atrasado"]),
      ),
    );

  revalidatePath("/contratos");
  revalidatePath(`/contratos/${id}`);
  revalidatePath("/financeiro");
  revalidatePath(`/clientes/${contrato.clienteId}`);
}

/** Gera as parcelas de um contrato que foi montado sem elas. */
export async function gerarParcelas(formData: FormData): Promise<Estado> {
  const eu = await requireUsuario();
  const id = String(formData.get("id") ?? "");
  if (!id) return { erro: "Contrato não encontrado." };

  const linhas = await db.select().from(contratos).where(eq(contratos.id, id)).limit(1);
  const contrato = linhas[0];
  if (!contrato) return { erro: "Contrato não encontrado." };

  const jaTem = await db
    .select({ id: lancamentos.id })
    .from(lancamentos)
    .where(eq(lancamentos.contratoId, id))
    .limit(1);
  if (jaTem.length) return { erro: "Este contrato já tem parcelas lançadas." };

  const plano = gerarCronograma({
    contratoId: id,
    clienteId: contrato.clienteId,
    valorTotal: contrato.valorTotal,
    parcelas: contrato.parcelas,
    intervaloDias: contrato.intervaloParcelasDias,
    inicio: contrato.inicio ?? hoje(),
    descricaoBase: contrato.titulo,
    autorId: eu.id,
    forma: String(formData.get("forma") ?? "pro_rata") === "entrada" ? "entrada" : "pro_rata",
  });

  if (!plano.length) return { erro: "Nada a lançar." };
  await db.insert(lancamentos).values(plano);

  revalidatePath(`/contratos/${id}`);
  revalidatePath("/financeiro");
  return { ok: `${plano.length} parcelas lançadas.` };
}