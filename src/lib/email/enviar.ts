/**
 * Envio de e-mail.
 *
 * Três decisões que valem explicar:
 *
 * 1. **Sem SDK.** O Resend é um `POST https://api.resend.com/emails` com
 *    um bearer token. Uma dependência a menos é um `npm audit` a menos,
 *    e o comportamento de erro fica explícito em vez de escondido numa
 *    exceção de biblioteca.
 *
 * 2. **Gravar antes de enviar.** Toda mensagem entra no banco *antes*
 *    de sair. Se o provedor cair no meio, o registro já existe com o que
 *    foi enviado — a Layane nunca perde o histórico. É o inverso do
 *    comum, que envia e só depois tenta registrar.
 *
 * 3. **Sem chave não quebra.** Sem `RESEND_API_KEY` as mensagens ficam
 *    em `rascunho`, visíveis na Central, prontas para envio. O sistema
 *    não quebra e a Layane consegue revisar o texto sem enviar nada.
 */

import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { mensagens } from "@/db/schema";
import { formatarData } from "@/lib/dates";
import { novoId } from "@/lib/ids";
import { brl } from "@/lib/money";
import { ASSUNTOS, TEXTOS, interpolar, tipoMensagem } from "@/lib/email/modelos";

/* ------------------------------------------------------------------ */
/* Configuração                                                        */
/* ------------------------------------------------------------------ */

export type ConfigEmail = {
  /** "resend" | "nenhum" — detectado das variáveis de ambiente. */
  modo: "resend" | "nenhum";
  remetente: string;
  remetenteNome: string;
  /** Endereço que o cliente responde. Cai no `reply-to` de tudo. */
  respostaPara: string;
};

/**
 * Lê a configuração do ambiente.
 *
 * O remetente precisa ser um domínio verificado no Resend. O
 * `onboarding@resend.dev` funciona para teste mas só entrega para o
 * dono da conta — por isso a Layane precisa verificar o domínio dela
 * antes de mandar para cliente de verdade.
 */
export function configEmail(): ConfigEmail {
  const chave = process.env.RESEND_API_KEY;
  return {
    modo: chave ? "resend" : "nenhum",
    remetente: process.env.EMAIL_REMETENTE ?? "layane@layanemarques.com.br",
    remetenteNome: process.env.EMAIL_REMETENTE_NOME ?? "Layane Marques",
    respostaPara: process.env.EMAIL_RESPOSTA_PARA ?? process.env.EMAIL_REMETENTE ?? "layane@layanemarques.com.br",
  };
}

export function emailConfigurado(): boolean {
  return configEmail().modo === "resend";
}

/* ------------------------------------------------------------------ */
/* Envio                                                               */
/* ------------------------------------------------------------------ */

const respostaProvedor = z.object({
  id: z.string().optional(),
  message: z.string().optional(),
  name: z.string().optional(),
});

export type ResultadoEnvio = {
  ok: boolean;
  id?: string;
  erro?: string;
};

/**
 * Chamada única ao Resend.
 *
 * Erro de rede, 4xx e 5xx viram todos o mesmo `ok: false` com o motivo
 * em texto — a fila só precisa saber se deu e o que falhou.
 */
export async function despachar(params: {
  para: string;
  paraNome?: string | null;
  assunto: string;
  corpoTexto: string;
  corpoHtml?: string | null;
  respostaPara: string;
}): Promise<ResultadoEnvio> {
  const cfg = configEmail();
  if (cfg.modo === "nenhum") {
    return { ok: false, erro: "Nenhum provedor de e-mail configurado (RESEND_API_KEY)." };
  }

  const carga = {
    from: `${cfg.remetenteNome} <${cfg.remetente}>`,
    to: params.paraNome ? `${params.paraNome} <${params.para}>` : params.para,
    reply_to: params.respostaPara,
    subject: params.assunto,
    text: params.corpoTexto,
    ...(params.corpoHtml ? { html: params.corpoHtml } : {}),
  };

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(carga),
    });

    const texto = await r.text();
    if (!r.ok) {
      let detalhe = texto;
      try {
        const j = respostaProvedor.parse(JSON.parse(texto));
        detalhe = j.message ?? j.name ?? texto;
      } catch {
        /* resposta não-JSON: devolve o bruto */
      }
      return { ok: false, erro: `HTTP ${r.status}: ${detalhe.slice(0, 300)}` };
    }

    const j = respostaProvedor.parse(JSON.parse(texto));
    return { ok: true, id: j.id };
  } catch (e) {
    return {
      ok: false,
      erro: e instanceof Error ? e.message : "Falha de rede ao enviar.",
    };
  }
}

/* ------------------------------------------------------------------ */
/* Fila                                                                */
/* ------------------------------------------------------------------ */

/** Quantas vezes a fila insiste antes de marcar como falha definitiva. */
const MAX_TENTATIVAS = 3;

export type NovoEnvio = {
  clienteId?: string | null;
  lancamentoId?: string | null;
  contratoId?: string | null;
  orcamentoId?: string | null;
  analiseId?: string | null;
  tipo: tipoMensagem;
  threadId?: string;
  paraNome: string;
  paraEmail: string;
  assunto: string;
  corpo: string;
  criadoPor: string;
  /** `true` grava sem enviar — usado para rascunho e conferência. */
  rascunho?: boolean;
};

/**
 * Enfileira e (se houver provedor) tenta enviar na hora.
 *
 * O envio é síncrono porque a Layane precisa saber *agora* se foi. Para
 * volume grande a UI usa `enviarLote`, que processa em Background.
 */
export async function enfileirar(dados: NovoEnvio): Promise<{ id: string; enviado: boolean; erro?: string }> {
  const threadId = dados.threadId ?? novoId("thr");
  const id = novoId("msg");

  await db.insert(mensagens).values({
    id,
    threadId,
    clienteId: dados.clienteId ?? null,
    lancamentoId: dados.lancamentoId ?? null,
    contratoId: dados.contratoId ?? null,
    orcamentoId: dados.orcamentoId ?? null,
    analiseId: dados.analiseId ?? null,
    tipo: dados.tipo,
    direcao: "enviada",
    destinatarioTipo: "cliente",
    paraNome: dados.paraNome,
    paraEmail: dados.paraEmail,
    assunto: dados.assunto,
    corpo: dados.corpo,
    status: dados.rascunho ? "rascunho" : "fila",
    criadoPor: dados.criadoPor,
  });

  if (dados.rascunho) return { id, enviado: false };

  const r = await despachar({
    para: dados.paraEmail,
    paraNome: dados.paraNome,
    assunto: dados.assunto,
    corpoTexto: dados.corpo,
    respostaPara: configEmail().respostaPara,
  });

  await aplicarResultado(id, r, dados.criadoPor);
  return { id, enviado: r.ok, erro: r.erro };
}

/** Grava o desfecho da tentativa e incrementa o contador. */
async function aplicarResultado(id: string, r: ResultadoEnvio, criadoPor: string): Promise<void> {
  await db
    .update(mensagens)
    .set(
      r.ok
        ? {
            status: "enviado" as const,
            provedorId: r.id ?? null,
            enviadoEm: new Date().toISOString(),
            tentativas: sql`${mensagens.tentativas} + 1`,
            ultimoErro: null,
          }
        : {
            status: "falhou" as const,
            ultimoErro: r.erro ?? "Erro desconhecido.",
            tentativas: sql`${mensagens.tentativas} + 1`,
          },
    )
    .where(eq(mensagens.id, id));
  void criadoPor;
}

/**
 * Reenvia uma mensagem que falhou.
 *
 * Só reenvia se ainda houver tentativas — um erro de configuração
 * (chave ausente, domínio não verificado) não melhora na 5ª tentativa e
 * só gera ruído no provedor.
 */
export async function reenviar(id: string): Promise<ResultadoEnvio> {
  const linhas = await db.select().from(mensagens).where(eq(mensagens.id, id)).limit(1);
  const m = linhas[0];
  if (!m) return { ok: false, erro: "Mensagem não encontrada." };
  if (m.tentativas >= MAX_TENTATIVAS) {
    return { ok: false, erro: `Limite de ${MAX_TENTATIVAS} tentativas atingido.` };
  }

  await db.update(mensagens).set({ status: "enviando" }).where(eq(mensagens.id, id));

  const r = await despachar({
    para: m.paraEmail,
    paraNome: m.paraNome,
    assunto: m.assunto,
    corpoTexto: m.corpo ?? "",
    respostaPara: configEmail().respostaPara,
  });

  await aplicarResultado(id, r, m.criadoPor ?? "");
  return r;
}

/** Reenvia em lote o que está preso na fila ou falhado. */
export async function reenviarPendentes(): Promise<{ enviados: number; falhas: number }> {
  const pendentes = await db
    .select({ id: mensagens.id })
    .from(mensagens)
    .where(
      and(
        inArray(mensagens.status, ["fila", "falhou"]),
        sql`${mensagens.tentativas} < ${MAX_TENTATIVAS}`,
      ),
    );

  let enviados = 0;
  let falhas = 0;
  for (const p of pendentes) {
    const r = await reenviar(p.id);
    if (r.ok) enviados += 1;
    else falhas += 1;
  }
  return { enviados, falhas };
}

/* ------------------------------------------------------------------ */
/* Respostas recebidas                                                 */
/* ------------------------------------------------------------------ */

/**
 * Registra uma resposta do cliente.
 *
 * O Resend encaminha a resposta para a caixa da Layane normalmente;
 * esta função existe para quando ela cola o texto de volta (ou quando
 * integrar um webhook). A mensagem entra na *mesma* thread da original,
 * que é o que faz a conversa aparecer inteira na Central.
 */
export async function registrarResposta(params: {
  threadId: string;
  deNome: string;
  deEmail: string;
  assunto: string;
  corpo: string;
}): Promise<string> {
  const id = novoId("msg");
  await db.insert(mensagens).values({
    id,
    threadId: params.threadId,
    direcao: "recebida",
    destinatarioTipo: "cliente",
    paraNome: params.deNome,
    paraEmail: params.deEmail,
    assunto: params.assunto,
    corpo: params.corpo,
    status: "lido",
    lidoEm: new Date().toISOString(),
  });

  // Marca o envio original como respondido.
  await db
    .update(mensagens)
    .set({ status: "respondido" })
    .where(and(eq(mensagens.threadId, params.threadId), eq(mensagens.direcao, "enviada")));

  return id;
}

/* ------------------------------------------------------------------ */
/* Atalho: cobrança                                                    */
/* ------------------------------------------------------------------ */

/**
 * Monta e envia a cobrança de um lançamento.
 *
 * Fica aqui, e não na action, porque tanto a cobrança avulsa quanto a
 * cobrança em lote precisam do mesmo texto. Duplicar esse corpo em dois
 * lugares é como os dois divergem.
 */
export async function enviarCobranca(params: {
  clienteNome: string;
  clienteEmail: string;
  valorCentavos: number;
  vencimento: string;
  descricao?: string | null;
  orcamentoId?: string | null;
  lancamentoId?: string | null;
  criadoPor: string;
  rascunho?: boolean;
}): Promise<{ id: string; enviado: boolean; erro?: string }> {
  const texto = interpolar(TEXTOS.cobranca, {
    cliente_nome: params.clienteNome,
    valor: brl(params.valorCentavos),
    vencimento: formatarData(params.vencimento),
    descricao: params.descricao ?? "Serviços de consultoria ambiental",
  });

  return enfileirar({
    clienteId: null,
    lancamentoId: params.lancamentoId ?? null,
    orcamentoId: params.orcamentoId ?? null,
    tipo: "cobranca",
    paraNome: params.clienteNome,
    paraEmail: params.clienteEmail,
    assunto: interpolar(ASSUNTOS.cobranca, {
      cliente_nome: params.clienteNome.split(" ")[0],
      valor: brl(params.valorCentavos),
    }),
    corpo: texto,
    criadoPor: params.criadoPor,
    rascunho: params.rascunho,
  });
}
