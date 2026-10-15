"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import {
  atendimentos,
  auditoria,
  demandas,
  documentos,
  type DemandaStatus,
} from "@/db/schema";
import { requireUsuario } from "@/lib/auth";
import { hoje, somaDias } from "@/lib/dates";
import { novoId } from "@/lib/ids";
import { paraCentavos } from "@/lib/money";

export type Estado = { erro?: string; ok?: string };

const opcional = z.string().trim().optional().or(z.literal(""));
const nulo = (v?: string) => (v && v.trim() ? v.trim() : null);

/* ------------------------------------------------------------------ */
/* Demandas —" a linha do funil                                         */
/* ------------------------------------------------------------------ */

const esquemaDemanda = z.object({
  clienteId: z.string().min(1, "Selecione o cliente."),
  titulo: z.string().trim().min(3, "Descreva a demanda."),
  servicoId: opcional,
  descricao: opcional,
  status: z.enum([
    "consulta",
    "diagnostico",
    "proposta",
    "contrato",
    "em_andamento",
    "concluido",
    "cancelado",
  ]) as unknown as z.ZodType<DemandaStatus>,
  valorEstimado: opcional,
  probabilidade: z.coerce.number().int().min(0).max(100).default(10),
  prazoDias: z.coerce.number().int().min(0).optional(),
  dataAbertura: opcional,
});

export async function salvarDemanda(
  _estado: Estado,
  formData: FormData,
): Promise<Estado> {
  const eu = await requireUsuario();
  const id = String(formData.get("id") ?? "");
  const clienteId = String(formData.get("clienteId") ?? "");

  const checado = esquemaDemanda.safeParse(Object.fromEntries(formData));
  if (!checado.success) {
    return { erro: checado.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const d = checado.data;

  const valores = {
    clienteId: d.clienteId,
    titulo: d.titulo,
    servicoId: nulo(d.servicoId),
    descricao: nulo(d.descricao),
    status: d.status,
    valorEstimado: paraCentavos(d.valorEstimado ?? "") ?? 0,
    probabilidade: d.probabilidade,
    prazoDias: d.prazoDias || null,
    dataAbertura: d.dataAbertura || hoje(),
    dataFechamento: d.status === "concluido" ? hoje() : null,
    responsavelId: eu.id,
    atualizadoEm: new Date().toISOString(),
  };

  if (id) {
    await db.update(demandas).set(valores).where(eq(demandas.id, id));
    revalidatePath("/demandas");
    revalidatePath(`/clientes/${clienteId}`);
    return { ok: "Demanda atualizada." };
  }

  const novo = novoId("dem");
  await db.insert(demandas).values({
    id: novo,
    criadoPor: eu.id,
    ...valores,
  });

  // A demanda nasce junto com o primeiro registro do histórico —" a
  // conversa que abriu o caso é o item nº 1 da linha do tempo.
  await db.insert(atendimentos).values({
    id: novoId("atd"),
    clienteId,
    demandaId: novo,
    data: valores.dataAbertura,
    tipo: "consulta",
    titulo: `Demanda aberta: ${valores.titulo}`,
    criadoPor: eu.id,
  });

  await db.insert(auditoria).values({
    id: novoId("aud"),
    usuarioId: eu.id,
    acao: "criar",
    entidade: "demanda",
    entidadeId: novo,
    detalhe: valores.titulo,
  });

  revalidatePath("/demandas");
  revalidatePath(`/clientes/${clienteId}`);
  return { ok: "Demanda registrada no funil." };
}

/**
 * Avança a demanda no funil.
 *
 * Quando vira "proposta", o sistema sugere montar o orçamento; quando
 * vira "contrato", sugere gerar o contrato e o cronograma de cobrança.
 * A decisão continua sendo da Layane —" o sistema só abre o caminho.
 */
export async function moverDemanda(formData: FormData): Promise<void> {
  await requireUsuario();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as DemandaStatus;
  if (!id || !status) return;

  const atual = await db.select().from(demandas).where(eq(demandas.id, id)).limit(1);
  const linha = atual[0];
  if (!linha) return;

  await db
    .update(demandas)
    .set({
      status,
      atualizadoEm: new Date().toISOString(),
      dataFechamento: status === "concluido" ? hoje() : null,
    })
    .where(eq(demandas.id, id));

  await db.insert(auditoria).values({
    id: novoId("aud"),
    usuarioId: String(formData.get("autorId") ?? ""),
    acao: "mover",
    entidade: "demanda",
    entidadeId: id,
    detalhe: `${linha.status} u{2192} ${status}`,
  });

  revalidatePath("/demandas");
  revalidatePath(`/clientes/${linha.clienteId}`);
}

/* ------------------------------------------------------------------ */
/* Atendimentos —" o histórico de relacionamento                         */
/* ------------------------------------------------------------------ */

const esquemaAtendimento = z.object({
  clienteId: z.string().min(1, "Selecione o cliente."),
  demandaId: opcional,
  data: z.string().min(1, "Informe a data."),
  tipo: z.enum([
    "consulta",
    "telefone",
    "whatsapp",
    "email",
    "reuniao",
    "visita_tecnica",
    "envio_documento",
    "cobranca",
    "outro",
  ]),
  titulo: z.string().trim().min(3, "Descreva o assunto."),
  resumo: opcional,
  proximoPasso: opcional,
  dataProximoPasso: opcional,
  duracaoMin: z.coerce.number().int().min(0).optional(),
});

export async function salvarAtendimento(
  _estado: Estado,
  formData: FormData,
): Promise<Estado> {
  const eu = await requireUsuario();
  const id = String(formData.get("id") ?? "");

  const checado = esquemaAtendimento.safeParse(Object.fromEntries(formData));
  if (!checado.success) {
    return { erro: checado.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const d = checado.data;

  const valores = {
    clienteId: d.clienteId,
    demandaId: nulo(d.demandaId),
    data: d.data,
    tipo: d.tipo,
    titulo: d.titulo,
    resumo: nulo(d.resumo),
    proximoPasso: nulo(d.proximoPasso),
    dataProximoPasso: nulo(d.dataProximoPasso),
    duracaoMin: d.duracaoMin || null,
  };

  if (id) {
    await db.update(atendimentos).set(valores).where(eq(atendimentos.id, id));
  } else {
    await db.insert(atendimentos).values({
      id: novoId("atd"),
      criadoPor: eu.id,
      ...valores,
    });
  }

  revalidatePath(`/clientes/${d.clienteId}`);
  revalidatePath("/painel");
  return { ok: id ? "Atendimento atualizado." : "Atendimento registrado." };
}

/* ------------------------------------------------------------------ */
/* Documentos e vencimentos                                             */
/* ------------------------------------------------------------------ */

const esquemaDocumento = z.object({
  clienteId: z.string().min(1, "Selecione o cliente."),
  nome: z.string().trim().min(2, "Informe o nome do documento."),
  tipo: opcional,
  orgao: opcional,
  numero: opcional,
  emissao: opcional,
  validade: opcional,
  status: z.enum(["valido", "a_vencer", "vencido", "nao_aplicavel"]),
  observacoes: opcional,
});

export async function salvarDocumento(
  _estado: Estado,
  formData: FormData,
): Promise<Estado> {
  const eu = await requireUsuario();
  const id = String(formData.get("id") ?? "");
  const clienteId = String(formData.get("clienteId") ?? "");

  const checado = esquemaDocumento.safeParse(Object.fromEntries(formData));
  if (!checado.success) {
    return { erro: checado.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const d = checado.data;

  const valores = {
    clienteId,
    nome: d.nome,
    tipo: nulo(d.tipo),
    orgao: nulo(d.orgao),
    numero: nulo(d.numero),
    emissao: nulo(d.emissao),
    validade: nulo(d.validade),
    status: d.status,
    observacoes: nulo(d.observacoes),
  };

  if (id) {
    await db.update(documentos).set(valores).where(eq(documentos.id, id));
  } else {
    await db.insert(documentos).values({
      id: novoId("doc"),
      criadoPor: eu.id,
      ...valores,
    });
  }

  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath("/documentos");
  revalidatePath("/painel");
  return { ok: id ? "Documento atualizado." : "Documento registrado." };
}

/** Correção de status em lote —" a tela de vencimentos é uma fila de trabalho. */
export async function marcarDocumento(formData: FormData): Promise<void> {
  await requireUsuario();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !status) return;

  await db
    .update(documentos)
    .set({ status: status as never })
    .where(eq(documentos.id, id));

  revalidatePath("/documentos");
}
