"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { atendimentos, auditoria, clientes, type ClienteStatus } from "@/db/schema";
import { requireUsuario } from "@/lib/auth";
import { hoje } from "@/lib/dates";
import { novoId } from "@/lib/ids";
import { somenteDigitos } from "@/lib/utils";

export type Estado = { erro?: string; ok?: string };

const texto = (max = 200) => z.string().trim().max(max).optional().or(z.literal(""));
const paraTexto = (v: string | undefined) => (v ? v : null);

const esquemaCliente = z.object({
  nome: z.string().trim().min(2, "Informe o nome do cliente."),
  nomeFantasia: texto(),
  cnpj: texto(20),
  cpf: texto(20),
  setorPublico: z.coerce.boolean().default(false),
  contatoNome: texto(),
  contatoCargo: texto(),
  contatoEmail: z
    .union([z.literal(""), z.string().trim().email("E-mail inválido.")])
    .optional()
    .or(z.literal("")),
  contatoTelefone: texto(30),
  whatsapp: texto(30),
  segmento: texto(),
  porte: texto(),
  endereco: texto(),
  cidade: texto(),
  uf: texto(2),
  status: z.enum([
    "potencial",
    "ativo",
    "inativo",
    "arquivado",
  ]) as unknown as z.ZodType<ClienteStatus>,
  origem: texto(),
  observacoes: texto(2000),
});

function limpar<T extends Record<string, unknown>>(dados: T) {
  return Object.fromEntries(
    Object.entries(dados).map(([k, v]) => [
      k,
      typeof v === "string" ? (v.trim() === "" ? null : v) : v,
    ]),
  ) as T;
}

export async function salvarCliente(
  _estado: Estado,
  formData: FormData,
): Promise<Estado> {
  const eu = await requireUsuario();
  const id = String(formData.get("id") ?? "");

  const checado = esquemaCliente.safeParse(Object.fromEntries(formData));
  if (!checado.success) {
    return { erro: checado.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const d = limpar(checado.data as unknown as Record<string, unknown>);

  const valores = {
    nome: d.nome as string,
    nomeFantasia: paraTexto(d.nomeFantasia as string | undefined),
    cnpj: paraTexto(
      d.cnpj ? somenteDigitos(d.cnpj as string) || (d.cnpj as string) : undefined,
    ),
    cpf: paraTexto(d.cpf ? somenteDigitos(d.cpf as string) || (d.cpf as string) : undefined),
    setorPublico: Boolean(d.setorPublico),
    contatoNome: paraTexto(d.contatoNome as string | undefined),
    contatoCargo: paraTexto(d.contatoCargo as string | undefined),
    contatoEmail: paraTexto(d.contatoEmail as string | undefined),
    contatoTelefone: paraTexto(d.contatoTelefone as string | undefined),
    whatsapp: paraTexto(
      d.whatsapp ? somenteDigitos(d.whatsapp as string) : undefined,
    ),
    segmento: paraTexto(d.segmento as string | undefined),
    porte: paraTexto(d.porte as string | undefined),
    endereco: paraTexto(d.endereco as string | undefined),
    cidade: paraTexto(d.cidade as string | undefined),
    uf: paraTexto(d.uf as string | undefined)?.toUpperCase() ?? null,
    status: d.status as ClienteStatus,
    origem: paraTexto(d.origem as string | undefined),
    observacoes: paraTexto(d.observacoes as string | undefined),
  };

  if (id) {
    await db
      .update(clientes)
      .set({ ...valores, atualizadoEm: new Date().toISOString() })
      .where(eq(clientes.id, id));
    revalidatePath(`/clientes/${id}`);
    revalidatePath("/clientes");
    return { ok: "Cliente atualizado." };
  }

  const novo = novoId("cli");
  await db.insert(clientes).values({
    id: novo,
    criadoPor: eu.id,
    ...valores,
  });

  await db.insert(auditoria).values({
    id: novoId("aud"),
    usuarioId: eu.id,
    acao: "criar",
    entidade: "cliente",
    entidadeId: novo,
    detalhe: valores.nome,
  });

  revalidatePath("/clientes");
  return { ok: `${valores.nome} cadastrado.` };
}

/**
 * Arquivar, nunca excluir.
 *
 * Cliente que tem atendimento, contrato ou financeiro é histórico
 professional. Apagar quebraria o passado —" o máximo que fazemos é
 * tirar da lista padrão.
 */
export async function arquivarCliente(formData: FormData): Promise<void> {
  await requireUsuario();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db
    .update(clientes)
    .set({ status: "arquivado", atualizadoEm: new Date().toISOString() })
    .where(eq(clientes.id, id));

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
}

export async function restaurarCliente(formData: FormData): Promise<void> {
  await requireUsuario();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db
    .update(clientes)
    .set({ status: "inativo", atualizadoEm: new Date().toISOString() })
    .where(eq(clientes.id, id));

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
}

export async function mudarStatusCliente(formData: FormData): Promise<void> {
  await requireUsuario();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as ClienteStatus;
  if (!id || !status) return;

  await db
    .update(clientes)
    .set({ status, atualizadoEm: new Date().toISOString() })
    .where(eq(clientes.id, id));

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
}

/** Cadastro rápido a partir do painel —" só o essencial. */
export async function cadastroRapido(
  _estado: Estado,
  formData: FormData,
): Promise<Estado> {
  const eu = await requireUsuario();
  const nome = String(formData.get("nome") ?? "").trim();
  if (nome.length < 2) return { erro: "Informe o nome do cliente." };

  const id = novoId("cli");
  await db.insert(clientes).values({
    id,
    nome,
    status: "potencial",
    criadoPor: eu.id,
  });

  revalidatePath("/clientes");
  return { ok: `${nome} cadastrado.` };
}

/** Busca usada pelo autocomplete nas outras telas. */
export async function buscarClientes(termo: string) {
  await requireUsuario();
  const alvo = `%${termo.toLowerCase()}%`;
  return db
    .select({ id: clientes.id, nome: clientes.nome })
    .from(clientes)
    .where(
      and(
        sql`lower(${clientes.nome}) like ${alvo}`,
        sql`${clientes.status} <> 'arquivado'`,
      ),
    )
    .limit(10);
}

/** Registro do primeiro contato —" o que transforma um contato solto em cliente. */
export async function registrarConsulta(
  _estado: Estado,
  formData: FormData,
): Promise<Estado> {
  const eu = await requireUsuario();
  const clienteId = String(formData.get("clienteId") ?? "");
  const titulo = String(formData.get("titulo") ?? "").trim();
  const resumo = String(formData.get("resumo") ?? "").trim();

  if (!clienteId) return { erro: "Selecione o cliente." };
  if (titulo.length < 3) return { erro: "Descreva o assunto da consulta." };

  const id = novoId("atd");

  await db.insert(atendimentos).values({
    id,
    clienteId,
    data: String(formData.get("data") ?? "") || hoje(),
    tipo: "consulta",
    titulo,
    resumo: resumo || null,
    proximoPasso: paraTexto(String(formData.get("proximoPasso") ?? "")),
    dataProximoPasso: paraTexto(String(formData.get("dataProximoPasso") ?? "")),
    criadoPor: eu.id,
  });

  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath("/demandas");
  return { ok: "Consulta registrada." };
}