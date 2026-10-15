"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db";
import {
  analisesConformidade,
  auditoria,
  modelosConformidade,
  type ModeloConformidade,
  type Resposta,
} from "@/db/schema";
import { requireAdmin, requireUsuario } from "@/lib/auth";
import { redigirParecer, resumir, sugerirRecomendacoes } from "@/lib/conformidade";
import { hoje } from "@/lib/dates";
import { novoId } from "@/lib/ids";

export type Estado = { erro?: string; ok?: string };

const RESPOSTAS = ["sim", "parcial", "nao", "nao_aplicavel", "nao_avaliado"] as const;

/* ------------------------------------------------------------------ */
/* Análises —" a aplicação do questionário a um cliente                  */
/* ------------------------------------------------------------------ */

/**
 * Inicia o diagnóstico e leva direto para o questionário.
 *
 * Sem tela intermediária: a Layane escolhe cliente + questionário e cai
 * na primeira pergunta. O caminho é o mais curto possível.
 */
export async function iniciarAnalise(formData: FormData): Promise<void> {
  await requireAdmin();
  const clienteId = String(formData.get("clienteId") ?? "");
  const modeloId = String(formData.get("modeloId") ?? "");
  const titulo = String(formData.get("titulo") ?? "").trim();

  if (!clienteId) redirect("/conformidade/nova?erro=cliente");
  if (!modeloId) redirect("/conformidade/nova?erro=questionario");

  const linhas = await db
    .select()
    .from(modelosConformidade)
    .where(eq(modelosConformidade.id, modeloId))
    .limit(1);
  const modelo = linhas[0];
  if (!modelo) redirect("/conformidade/nova?erro=questionario");

  const id = novoId("ana");
  await db.insert(analisesConformidade).values({
    id,
    clienteId,
    modeloId,
    titulo: titulo || modelo.nome,
    status: "em_resposta",
    respostas: {},
    criadoPor: (await requireAdmin()).id,
  });

  revalidatePath("/conformidade");
  redirect(`/conformidade/${id}`);
}

/**
 * Salva as respostas.
 *
 * Recebe o mapa `perguntaId -> { resposta, evidencia, observacao }`.
 * Resposta vazia = `nao_avaliado`, que não entra no índice —" melhor do
 * que a Layane fechar com "não conforme" sem ter olhado.
 */
export async function salvarRespostas(
  _estado: Estado,
  formData: FormData,
): Promise<Estado> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { erro: "Análise não encontrada." };

  const linhas = await db
    .select()
    .from(analisesConformidade)
    .where(eq(analisesConformidade.id, id))
    .limit(1);
  const analise = linhas[0];
  if (!analise) return { erro: "Análise não encontrada." };

  if (analise.status === "emitido" || analise.status === "enviado") {
    return { erro: "Esta análise já foi emitida. Abra uma nova para revisar." };
  }

  const perguntas = formData.getAll("perguntaId").map(String);
  const respostas: Record<string, Resposta> = { ...analise.respostas };

  perguntas.forEach((pid, i) => {
    const r = String(formData.get(`resposta_${pid}`) ?? "");
    const evidencia = String(formData.get(`evidencia_${pid}`) ?? "").trim();
    const observacao = String(formData.get(`observacao_${pid}`) ?? "").trim();

    const valor = (RESPOSTAS as readonly string[]).includes(r)
      ? r
      : "nao_avaliado";

    respostas[pid] = {
      resposta: valor,
      evidencia: evidencia || undefined,
      observacao: observacao || undefined,
    };
    void i;
  });

  await db
    .update(analisesConformidade)
    .set({ respostas, atualizadoEm: new Date().toISOString() })
    .where(eq(analisesConformidade.id, id));

  revalidatePath(`/conformidade/${id}`);
  revalidatePath("/conformidade");
  return { ok: "Respostas salvas." };
}

/**
 * Emite o parecer.
 *
 * Congela o modelo aplicado: se a Layane editar o questionário depois,
 * o documento já emitido continua mostrando o que foi realmente avaliado.
 */
export async function emitirAnalise(
  _estado: Estado,
  formData: FormData,
): Promise<Estado> {
  const eu = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { erro: "Análise não encontrada." };

  const linhas = await db
    .select()
    .from(analisesConformidade)
    .where(eq(analisesConformidade.id, id))
    .limit(1);
  const analise = linhas[0];
  if (!analise) return { erro: "Análise não encontrada." };

  const modelos = await db
    .select()
    .from(modelosConformidade)
    .where(eq(modelosConformidade.id, analise.modeloId))
    .limit(1);
  const modelo = modelos[0]?.modelo;
  if (!modelo) return { erro: "Questionário não encontrado." };

  const respostas = (analise.respostas ?? {}) as Record<string, Resposta>;

  const naoAvaliadas = modelo.perguntas.filter(
    (p) => (respostas[p.id]?.resposta ?? "nao_avaliado") === "nao_avaliado",
  ).length;

  if (naoAvaliadas > 0) {
    return {
      erro: `Faltam ${naoAvaliadas} perguntas para responder. Um item não avaliado não pode entrar no índice.`,
    };
  }

  const resumo = resumir(modelo, respostas);

  const parecerManual = String(formData.get("parecer") ?? "").trim();
  const parecer = parecerManual
    ? parecerManual
    : redigirParecer({
        cliente: "",
        modelo,
        resumo,
        hoje: hoje(),
        autor: eu.nome,
      });

  const recomendacoes =
    String(formData.get("recomendacoes") ?? "").trim() ||
    sugerirRecomendacoes(resumo).join("\n");

  await db
    .update(analisesConformidade)
    .set({
      status: "emitido",
      parecer,
      recomendacoes,
      indiceConformidade: resumo.indiceGeral,
      modeloAplicado: modelo,
      emitidoEm: hoje(),
      atualizadoEm: new Date().toISOString(),
    })
    .where(eq(analisesConformidade.id, id));

  await db.insert(auditoria).values({
    id: novoId("aud"),
    usuarioId: eu.id,
    acao: "emitir",
    entidade: "analise_conformidade",
    entidadeId: id,
    detalhe: `Índice ${resumo.indiceGeral}%`,
  });

  revalidatePath("/conformidade");
  revalidatePath(`/conformidade/${id}`);
  revalidatePath(`/clientes/${analise.clienteId}`);
  return { ok: `Parecer emitido —" índice ${resumo.indiceGeral}%.` };
}

export async function marcarEnviada(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db
    .update(analisesConformidade)
    .set({ status: "enviado", atualizadoEm: new Date().toISOString() })
    .where(eq(analisesConformidade.id, id));
  revalidatePath("/conformidade");
  revalidatePath(`/conformidade/${id}`);
}

/* ------------------------------------------------------------------ */
/* Modelos —" o questionário é editável                                 */
/* ------------------------------------------------------------------ */

const esquemaModelo = z.object({
  nome: z.string().trim().min(3, "Dê um nome ao questionário."),
  descricao: z.string().trim().optional(),
  versao: z.string().trim().min(1, "Informe a versão."),
  titulo: z.string().trim().min(3, "Informe o título do relatório."),
  subtitulo: z.string().trim().optional(),
  introducao: z.string().trim().optional(),
  perguntasJson: z.string().min(2, "O questionário precisa de perguntas."),
});

export async function salvarModelo(
  _estado: Estado,
  formData: FormData,
): Promise<Estado> {
  const eu = await requireAdmin();
  const id = String(formData.get("id") ?? "");

  const checado = esquemaModelo.safeParse(Object.fromEntries(formData));
  if (!checado.success) {
    return { erro: checado.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const d = checado.data;

  let perguntas: ModeloConformidade["perguntas"];
  try {
    perguntas = JSON.parse(d.perguntasJson);
  } catch {
    return { erro: "Não consegui ler a lista de perguntas. Revise a sintaxe." };
  }
  if (!Array.isArray(perguntas) || perguntas.length === 0) {
    return { erro: "O questionário precisa de pelo menos uma pergunta." };
  }

  const modelo: ModeloConformidade = {
    versao: d.versao,
    titulo: d.titulo,
    subtitulo: d.subtitulo || undefined,
    introducao: d.introducao || undefined,
    assinatura: {
      nome: eu.nome,
      cargo: "Gestora Ambiental",
      registro: "Gestão Ambiental Aplicada",
    },
    perguntas: perguntas.map((p, i) => ({
      id: String(p.id || `p${i + 1}`),
      bloco: p.bloco || undefined,
      pergunta: String(p.pergunta ?? "").trim(),
      ajuda: p.ajuda || undefined,
      referencia: p.referencia || undefined,
      criticidade: p.criticidade ?? "media",
      exigeAcao: Boolean(p.exigeAcao),
      documentoVinculado: Boolean(p.documentoVinculado),
    })),
  };

  const semPergunta = modelo.perguntas.find((p) => !p.pergunta);
  if (semPergunta) return { erro: "Há uma pergunta sem texto." };

  const valores = {
    nome: d.nome,
    descricao: d.descricao || null,
    versao: d.versao,
    modelo,
    atualizadoEm: new Date().toISOString(),
  };

  if (id) {
    await db
      .update(modelosConformidade)
      .set(valores)
      .where(eq(modelosConformidade.id, id));
  } else {
    await db.insert(modelosConformidade).values({
      id: novoId("mdl"),
      ativo: true,
      criadoPor: eu.id,
      ...valores,
    });
  }

  revalidatePath("/conformidade/modelos");
  revalidatePath("/config");
  return { ok: id ? "Questionário atualizado." : "Questionário criado." };
}

export async function duplicarModelo(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const linhas = await db
    .select()
    .from(modelosConformidade)
    .where(eq(modelosConformidade.id, id))
    .limit(1);
  const original = linhas[0];
  if (!original) return;

  await db.insert(modelosConformidade).values({
    id: novoId("mdl"),
    nome: `${original.nome} (cópia)`,
    descricao: original.descricao,
    versao: original.versao,
    modelo: original.modelo,
    ativo: false,
    criadoPor: original.criadoPor,
  });

  revalidatePath("/conformidade/modelos");
}

export async function alternarModelo(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const linhas = await db
    .select({ ativo: modelosConformidade.ativo })
    .from(modelosConformidade)
    .where(eq(modelosConformidade.id, id))
    .limit(1);
  if (!linhas[0]) return;

  await db
    .update(modelosConformidade)
    .set({ ativo: !linhas[0].ativo })
    .where(eq(modelosConformidade.id, id));

  revalidatePath("/conformidade/modelos");
  revalidatePath("/config");
}

/** Copia um modelo como base de uma adaptação por demanda. */
export async function copiarModeloPara(
  _estado: Estado,
  formData: FormData,
): Promise<Estado> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  if (!id || nome.length < 3) return { erro: "Informe o nome da cópia." };

  const linhas = await db
    .select()
    .from(modelosConformidade)
    .where(eq(modelosConformidade.id, id))
    .limit(1);
  const original = linhas[0];
  if (!original) return { erro: "Questionário não encontrado." };

  const novo = novoId("mdl");
  await db.insert(modelosConformidade).values({
    id: novo,
    nome,
    descricao: original.descricao,
    versao: original.versao,
    modelo: original.modelo,
    ativo: true,
  });

  revalidatePath("/conformidade/modelos");
  return { ok: `Copiado para "${nome}".` };
}

/* Consultas auxiliares ------------------------------------------------ */

export async function listarModelosAtivos() {
  await requireUsuario();
  return db
    .select({
      id: modelosConformidade.id,
      nome: modelosConformidade.nome,
      versao: modelosConformidade.versao,
    })
    .from(modelosConformidade)
    .where(eq(modelosConformidade.ativo, true))
    .orderBy(modelosConformidade.nome);
}

export async function obterModelo(id: string) {
  await requireUsuario();
  const linhas = await db
    .select()
    .from(modelosConformidade)
    .where(eq(modelosConformidade.id, id))
    .limit(1);
  return linhas[0] ?? null;
}

/** Apaga análise ainda em rascunho —" o que já foi emitido fica. */
export async function removerAnalise(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const linhas = await db
    .select({ status: analisesConformidade.status })
    .from(analisesConformidade)
    .where(eq(analisesConformidade.id, id))
    .limit(1);
  if (linhas[0] && linhas[0].status !== "rascunho") return;

  await db
    .delete(analisesConformidade)
    .where(
      and(
        eq(analisesConformidade.id, id),
        eq(analisesConformidade.status, "rascunho"),
      ),
    );

  revalidatePath("/conformidade");
}