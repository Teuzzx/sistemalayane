/**
 * Leituras da Central de Mensagens.
 *
 * Fica em arquivo próprio, e não dentro de `consultas.ts`, por um motivo
 * prático: as consultas de mensagem são as únicas que precisam de
 * contagem por status e de join com cliente para a tela de thread.
 * Misturar com as outras deixaria um arquivo de 900 linhas onde metade
 * é agregação e metade é listagem.
 */

import "server-only";

import { and, count, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { clientes, lancamentos, mensagens } from "@/db/schema";
import type { MensagemTipo, StatusEnvio } from "@/db/schema";
import type { LinhaCobranca } from "@/lib/email/cobranca";

/* ------------------------------------------------------------------ */
/* Listagem                                                            */
/* ------------------------------------------------------------------ */

export type LinhaMensagem = {
  id: string;
  threadId: string;
  tipo: MensagemTipo;
  direcao: "enviada" | "recebida";
  assunto: string;
  status: StatusEnvio;
  tentativas: number;
  ultimoErro: string | null;
  paraNome: string | null;
  paraEmail: string;
  criadoEm: string;
  enviadoEm: string | null;
  clienteId: string | null;
  clienteNome: string | null;
};

export type FiltroMensagens = {
  status?: StatusEnvio | "todas";
  tipo?: MensagemTipo | "todos";
  busca?: string;
  limite?: number;
};

export async function listarMensagens(filtro: FiltroMensagens = {}): Promise<LinhaMensagem[]> {
  const condicoes = [];

  if (filtro.status && filtro.status !== "todas") {
    condicoes.push(eq(mensagens.status, filtro.status));
  }
  if (filtro.tipo && filtro.tipo !== "todos") {
    condicoes.push(eq(mensagens.tipo, filtro.tipo));
  }

  const busca = filtro.busca?.trim();
  if (busca) {
    const alvo = `%${busca.toLowerCase()}%`;
    condicoes.push(
      sql`(
        lower(${mensagens.assunto}) like ${alvo}
        or lower(${mensagens.paraNome}) like ${alvo}
        or lower(${mensagens.paraEmail}) like ${alvo}
        or lower(${clientes.nome}) like ${alvo}
      )`,
    );
  }

  return db
    .select({
      id: mensagens.id,
      threadId: mensagens.threadId,
      tipo: mensagens.tipo,
      direcao: mensagens.direcao,
      assunto: mensagens.assunto,
      status: mensagens.status,
      tentativas: mensagens.tentativas,
      ultimoErro: mensagens.ultimoErro,
      paraNome: mensagens.paraNome,
      paraEmail: mensagens.paraEmail,
      criadoEm: mensagens.criadoEm,
      enviadoEm: mensagens.enviadoEm,
      clienteId: mensagens.clienteId,
      clienteNome: clientes.nome,
    })
    .from(mensagens)
    .leftJoin(clientes, eq(mensagens.clienteId, clientes.id))
    .where(condicoes.length ? and(...condicoes) : undefined)
    .orderBy(desc(mensagens.criadoEm))
    .limit(filtro.limite ?? 100);
}

/** Quantas mensagens há em cada status. Alimenta os números da aba. */
export async function contarPorStatus(): Promise<Record<string, number>> {
  const linhas = await db
    .select({ status: mensagens.status, n: count() })
    .from(mensagens)
    .groupBy(mensagens.status);

  const mapa: Record<string, number> = {};
  for (const l of linhas) mapa[l.status] = l.n;
  return mapa;
}

/* ------------------------------------------------------------------ */
/* Cobrança em lote                                                    */
/* ------------------------------------------------------------------ */

/**
 * Monta as linhas que `planoDeCobranca` decide.
 *
 * Traz junto o último aviso já enviado daquele lançamento — é o que
 * impede o sistema de mandar três lembretes na semana. A consulta é por
 * data, não por status, porque só o que já saiu interessa.
 */
export async function linhasParaCobranca(): Promise<LinhaCobranca[]> {
  const vencidos = await db
    .select({
      lancamentoId: mensagens.lancamentoId,
      criadoEm: mensagens.criadoEm,
    })
    .from(mensagens)
    .where(
      and(
        eq(mensagens.tipo, "cobranca"),
        inArray(mensagens.status, ["enviado", "respondido", "lido"]),
      ),
    );

  /** Último aviso por lançamento, em memória — o volume é pequeno. */
  const ultimoAviso = new Map<string, string>();
  for (const m of vencidos) {
    if (!m.lancamentoId) continue;
    const anterior = ultimoAviso.get(m.lancamentoId);
    if (!anterior || m.criadoEm > anterior) {
      ultimoAviso.set(m.lancamentoId, m.criadoEm);
    }
  }

  const linhas = await db
    .select({
      lancamentoId: lancamentos.id,
      descricao: lancamentos.descricao,
      valorCentavos: lancamentos.valor,
      vencimento: lancamentos.vencimento,
      status: lancamentos.status,
      clienteId: lancamentos.clienteId,
      clienteNome: clientes.nome,
      emailCliente: clientes.contatoEmail,
    })
    .from(lancamentos)
    .innerJoin(clientes, eq(lancamentos.clienteId, clientes.id))
    .where(inArray(lancamentos.status, ["pendente", "atrasado"]));

  /* Uma linha por lançamento: o join por cliente é 1:1, mas sem isso
     o mesmo lançamento apareceria repetido se o cliente tivesse mais
     de um registro por algum motivo. */
  const vista = new Set<string>();
  const saida: LinhaCobranca[] = [];

  for (const l of linhas) {
    if (vista.has(l.lancamentoId)) continue;
    vista.add(l.lancamentoId);

    const aviso = ultimoAviso.get(l.lancamentoId);
    saida.push({
      lancamentoId: l.lancamentoId,
      descricao: l.descricao,
      valorCentavos: l.valorCentavos,
      vencimento: l.vencimento ?? "",
      status: l.status,
      ultimaCobrancaEm: aviso ? aviso.slice(0, 10) : null,
      clienteId: l.clienteId,
      clienteNome: l.clienteNome,
      emailCliente: l.emailCliente,
      primeiroNome: l.clienteNome?.split(" ")[0] ?? null,
    });
  }

  return saida;
}

/** Padrões de e-mail para a tela de configuração. */
export async function statusDoProvedor(): Promise<{ configurado: boolean; remetente: string }> {
  const { configEmail } = await import("@/lib/email/enviar");
  const cfg = configEmail();
  return { configurado: cfg.modo === "resend", remetente: cfg.remetente };
}
