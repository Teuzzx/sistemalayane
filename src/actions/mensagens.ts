"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUsuario } from "@/lib/auth";
import {
  configEmail,
  emailConfigurado,
  enfileirar,
  enviarCobranca as enviarCobrancaDe,
  registrarResposta,
  reenviar as reenviarMensagem,
} from "@/lib/email/enviar";
import { planoDeCobranca, type UrgenciaCobranca } from "@/lib/email/cobranca";
import { ASSUNTOS, TEXTOS, interpolar, textoParaHtml } from "@/lib/email/modelos";
import { novoId } from "@/lib/ids";
import { brl } from "@/lib/money";
import { formatarData, hoje } from "@/lib/dates";
import { linhasParaCobranca } from "@/lib/consultasMensagens";
import type { MensagemTipo } from "@/db/schema";

export type EstadoEnvio = {
  erro?: string;
  ok?: string;
  /** Detalhe do que aconteceu, para o painel da Central. */
  detalhe?: string;
};

/* ------------------------------------------------------------------ */
/* Envio avulso                                                        */
/* ------------------------------------------------------------------ */

const esquemaEnvio = z.object({
  clienteId: z.string().min(1),
  tipo: z.enum([
    "cobranca",
    "contrato",
    "orcamento",
    "conformidade",
    "documento",
    "aviso",
    "atendimento",
  ]),
  assunto: z.string().trim().min(3, "Escreva o assunto."),
  corpo: z.string().trim().min(10, "Escreva a mensagem."),
  rascunho: z.string().optional(),
});

/**
 * Envia uma mensagem para um cliente, agora.
 *
 * Toda action começa com `requireUsuario`. A sessão é conferida aqui e
 * não herdada do layout: uma action é um endpoint POST que qualquer um
 * pode chamar direto, e o layout nem roda no caminho dela.
 */
export async function enviarMensagem(
  _estado: EstadoEnvio,
  formData: FormData,
): Promise<EstadoEnvio> {
  const usuario = await requireUsuario();

  const checado = esquemaEnvio.safeParse(Object.fromEntries(formData));
  if (!checado.success) {
    return { erro: checado.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { clienteId, tipo, assunto, corpo } = checado.data;
  const rascunho = checado.data.rascunho === "sim";

  /* O e-mail do cliente vem do banco, nunca do formulário. Aceitar do
     formulário deixaria a Layane (ou um bug) mandar a cobrança de um
     cliente para o endereço de outro. */
  const { db } = await import("@/db");
  const { clientes } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  const linhas = await db
    .select({
      nome: clientes.nome,
      contatoNome: clientes.contatoNome,
      email: clientes.contatoEmail,
    })
    .from(clientes)
    .where(eq(clientes.id, clienteId))
    .limit(1);

  const cliente = linhas[0];
  if (!cliente) return { erro: "Cliente não encontrado." };
  if (!cliente.email) {
    return { erro: `${cliente.nome} não tem e-mail cadastrado.` };
  }

  const r = await enfileirar({
    clienteId,
    tipo: tipo as MensagemTipo,
    paraNome: cliente.contatoNome || cliente.nome,
    paraEmail: cliente.email,
    assunto,
    corpo,
    criadoPor: usuario.id,
    rascunho,
  });

  revalidatePath("/mensagens");
  revalidatePath("/financeiro");

  if (rascunho) {
    return { ok: "Rascunho guardado na Central." };
  }
  if (!emailConfigurado()) {
    return {
      ok: "Mensagem guardada como rascunho — nenhum provedor de e-mail está configurado ainda.",
      detalhe: "Sem RESEND_API_KEY o envio não sai. Configure em Configurações › E-mail.",
    };
  }
  if (r.enviado) {
    return { ok: `E-mail enviado para ${cliente.email}.` };
  }
  return { erro: `Não foi possível enviar: ${r.erro ?? "erro desconhecido"}` };
}

/* ------------------------------------------------------------------ */
/* Reenvio                                                             */
/* ------------------------------------------------------------------ */

export async function reenviar(formData: FormData): Promise<void> {
  await requireUsuario();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await reenviarMensagem(id);
  revalidatePath("/mensagens");
}

/* ------------------------------------------------------------------ */
/* Cobrança                                                           */
/* ------------------------------------------------------------------ */

/**
 * Monta o plano sem enviar nada.
 *
 * A Layane precisa ver **quem vai receber e o que vai sair** antes de
 * mandar. Disparo em lote sem prévia é a forma mais rápida de queimar
 * a reputação do e-mail dela com um lote inteiro de cliente errado.
 */
export async function prepararCobranca(): Promise<{
  totalCentavos: number;
  itens: {
    lancamentoId: string;
    clienteNome: string;
    email: string;
    valorCentavos: number;
    vencimento: string;
    dias: number;
    urgencia: UrgenciaCobranca;
    descricao: string;
  }[];
  ignorados: { lancamentoId: string; clienteNome: string; motivo: string }[];
}> {
  await requireUsuario();

  const linhas = await linhasParaCobranca();
  const plano = planoDeCobranca(linhas, hoje());

  return {
    totalCentavos: plano.totalCentavos,
    itens: plano.incluidos.map((i) => ({
      lancamentoId: i.lancamentoId,
      clienteNome: i.clienteNome ?? i.primeiroNome ?? "Cliente",
      email: i.emailCliente ?? "",
      valorCentavos: i.valorCentavos ?? 0,
      vencimento: i.vencimento,
      dias: i.diasParaVencimento,
      urgencia: i.urgencia,
      descricao: i.descricao,
    })),
    ignorados: plano.excluidos.map((e) => ({
      lancamentoId: e.lancamentoId,
      clienteNome: e.clienteNome ?? "—",
      motivo: e.motivo,
    })),
  };
}

/**
 * Dispara a cobrança em lote.
 *
 * `apenas` limita a quem vai. Vazio (ou ausente) manda para todos os
 * que o plano aprovou — que é o que a Layane quer no botão "cobra
 * todos". A distinção importa: "todos" é o padrão perigoso, então a
 * tela de confirmação lista os destinatários antes de chamar isto.
 */
export async function cobrarSelecionados(
  _estado: EstadoEnvio,
  formData: FormData,
): Promise<EstadoEnvio> {
  const usuario = await requireUsuario();

  const apenas = new Set(formData.getAll("lancamentoId").map(String).filter(Boolean));
  const modoRascunho = formData.get("rascunho") === "sim";

  const linhas = await linhasParaCobranca();
  const plano = planoDeCobranca(linhas, hoje());

  const alvos = plano.incluidos.filter(
    (i) => apenas.size === 0 || apenas.has(i.lancamentoId),
  );

  if (!alvos.length) {
    return { erro: "Nenhuma cobrança selecionada." };
  }

  let enviados = 0;
  let falharam = 0;
  const problemas: string[] = [];

  for (const item of alvos) {
    const r = await enviarCobrancaDe({
      clienteNome: item.clienteNome ?? "Cliente",
      clienteEmail: item.emailCliente ?? "",
      valorCentavos: item.valorCentavos ?? 0,
      vencimento: item.vencimento,
      descricao: item.descricao,
      lancamentoId: item.lancamentoId,
      criadoPor: usuario.id,
      rascunho: modoRascunho,
    });

    if (r.enviado) enviados += 1;
    else {
      falharam += 1;
      if (problemas.length < 3) {
        problemas.push(`${item.clienteNome}: ${r.erro ?? "falhou"}`);
      }
    }
  }

  revalidatePath("/mensagens");
  revalidatePath("/financeiro");
  revalidatePath("/painel");

  if (modoRascunho) {
    return {
      ok: `${alvos.length} cobrança(s) guardada(s) como rascunho na Central.`,
    };
  }

  const resumo = `${enviados} enviado(s) de ${alvos.length}.`;
  if (falharam) {
    return {
      erro: `${resumo} ${falharam} falharam. ${problemas.join(" · ")}`,
    };
  }
  return { ok: resumo };
}

/* ------------------------------------------------------------------ */
/* Resposta recebida                                                   */
/* ------------------------------------------------------------------ */

const esquemaResposta = z.object({
  threadId: z.string().min(1),
  deNome: z.string().trim().min(1, "Quem respondeu."),
  deEmail: z.string().trim().pipe(z.email("E-mail inválido.")),
  assunto: z.string().trim().min(1, "Assunto da resposta."),
  corpo: z.string().trim().min(1, "Cole o texto da resposta."),
});

/**
 * Registra a resposta do cliente na mesma conversa.
 *
 * O Resend não entrega resposta para dentro do sistema sozinho — quem
 * responde é a Layane, no e-mail dela, e o texto volta colado aqui.
 * Esta action existe para dar o lugar de guardar, para o histórico não
 * depender de alguém achar um e-mail perdido.
 */
export async function registrarRespostaDoCliente(
  _estado: EstadoEnvio,
  formData: FormData,
): Promise<EstadoEnvio> {
  await requireUsuario();

  const checado = esquemaResposta.safeParse(Object.fromEntries(formData));
  if (!checado.success) {
    return { erro: checado.error.issues[0]?.message ?? "Dados inválidos." };
  }

  await registrarResposta(checado.data);
  revalidatePath("/mensagens");

  return { ok: "Resposta registrada na conversa." };
}

/* ------------------------------------------------------------------ */
/* Prévia                                                              */
/* ------------------------------------------------------------------ */

/**
 * Gera o texto que *sairia*, para a Layane conferir antes de disparar.
 *
 * Mesma função que o envio usa. Se a prévia e o envio usassem textos
 * diferentes, a prévia estaria Nile e valendo nada.
 */
export async function previaCobranca(params: {
  nome: string;
  valorCentavos: number;
  vencimento: string;
  descricao: string;
  urgencia: UrgenciaCobranca;
}): Promise<{ assunto: string; corpo: string }> {
  await requireUsuario();

  const valores = {
    cliente_nome: params.nome.split(" ")[0],
    valor: brl(params.valorCentavos),
    vencimento: formatarData(params.vencimento),
    descricao: params.descricao,
  };

  /* O texto muda com a urgência: cobrar o que vence domingo não é a
     mesma conversa que cobrar o que está vencido há dez dias. */
  const corpo =
    params.urgencia === "atraso" ? TEXTOS.cobranca : TEXTOS.aviso;

  const assunto =
    params.urgencia === "atraso"
      ? interpolar(ASSUNTOS.cobranca, valores)
      : interpolar(ASSUNTOS.aviso, valores);

  return {
    assunto,
    corpo:
      params.urgencia === "atraso"
        ? interpolar(corpo, valores)
        : `${corpo}\n\n${interpolar(TEXTOS.cobranca, valores)}`,
  };
}

/* ------------------------------------------------------------------ */
/* Modelos editáveis                                                   */
/* ------------------------------------------------------------------ */

/** Texto-base que a Layane edita uma vez e reusa. */
export async function textoPadrao(tipo: MensagemTipo): Promise<{ assunto: string; corpo: string; html: string }> {
  await requireUsuario();
  return {
    assunto: ASSUNTOS[tipo],
    corpo: TEXTOS[tipo],
    html: textoParaHtml(TEXTOS[tipo]),
  };
}

export async function configuracaoProvedor(): Promise<{
  configurado: boolean;
  remetente: string;
  nome: string;
  respostaPara: string;
}> {
  await requireUsuario();
  const cfg = configEmail();
  return {
    configurado: cfg.modo === "resend",
    remetente: cfg.remetente,
    nome: cfg.remetenteNome,
    respostaPara: cfg.respostaPara,
  };
}

/** Id novo, para o formulário abrir uma linha de rascunho. */
export async function novoIdMensagem(): Promise<string> {
  await requireUsuario();
  return novoId("msg");
}
