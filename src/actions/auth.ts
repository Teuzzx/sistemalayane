"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db";
import { sessoes, usuarios } from "@/db/schema";
import {
  criarSessao,
  destruirSessao,
  hashSenha,
  requireAdmin,
  verificarSenha,
} from "@/lib/auth";
import { novoId } from "@/lib/ids";
import { avaliarSenha } from "@/lib/senha";
import { ipDoCliente, limpar, registrar, situacao } from "@/lib/seguranca";

export type EstadoForm = {
  erro?: string;
  ok?: string;
};

/* ------------------------------------------------------------------ */
/* Sessão                                                              */
/* ------------------------------------------------------------------ */

const esquemaLogin = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("E-mail inválido.")),
  senha: z.string().min(1, "Informe a senha."),
});

/**
 * Hash descartável, só para gastar o mesmo tempo do bcrypt quando o
 * e-mail não existe. Sem ele a resposta para "e-mail inexistente"
 * voltaria em ~2ms em vez de ~200ms — e essa diferença revelaria quem
 * tem conta no sistema.
 */
const DUMMY_HASH = "$2a$12$4QOCrDDBtxf2cRwCcXBbLueVHH3Bqx4uMXmmpHXHBc0Q8uLPZ7y";

export async function entrar(
  _estado: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const checado = esquemaLogin.safeParse(Object.fromEntries(formData));
  if (!checado.success) {
    return { erro: checado.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { email, senha } = checado.data;
  const ip = await ipDoCliente();

  /*
   * Antes de tocar no banco: se já há tentativa de força bruta em curso,
   * nem comparamos a senha. A mensagem diz quanto falta, não por quê
   * exatamente — revelar a regra deixaria o atacante calibrar o ataque.
   */
  const bloqueio = await situacao(email, ip);
  if (bloqueio.bloqueado) {
    return {
      erro: `Muitas tentativas. Tente novamente em ${bloqueio.esperaMin} minuto(s).`,
    };
  }

  const linhas = await db
    .select()
    .from(usuarios)
    .where(eq(usuarios.email, email))
    .limit(1);
  const usuario = linhas[0];

  /*
   * Mesma resposta e mesmo tempo para "não existe" e "senha errada". A
   * tela de login não pode virar lista de e-mails cadastrados.
   */
  const referencia = usuario?.senhaHash ?? DUMMY_HASH;
  const confere = await verificarSenha(senha, referencia);

  if (!usuario || !usuario.ativo || !confere) {
    await registrar(email, ip, false, usuario ? "senha" : "inexistente");
    return { erro: "E-mail ou senha incorretos." };
  }

  await registrar(email, ip, true);
  await limpar(email);
  await criarSessao(usuario.id);
  redirect("/painel");
}

export async function sair(): Promise<void> {
  await destruirSessao();
  redirect("/login");
}

/* ------------------------------------------------------------------ */
/* Usuários — só admin                                                */
/* ------------------------------------------------------------------ */

const esquemaNovoUsuario = z.object({
  nome: z.string().trim().min(2, "Informe o nome completo."),
  email: z.string().trim().toLowerCase().pipe(z.email("E-mail inválido.")),
  cargo: z.string().trim().optional(),
  papel: z.enum(["admin", "assistente"]),
  senha: z.string().min(1, "Informe a senha."),
});

export async function criarUsuario(
  _estado: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  await requireAdmin();

  const checado = esquemaNovoUsuario.safeParse(Object.fromEntries(formData));
  if (!checado.success) {
    return { erro: checado.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { nome, email, cargo, papel, senha } = checado.data;

  const forca = avaliarSenha(senha);
  if (!forca.ok) {
    return { erro: `Senha fraca: ${forca.problemas.join(" ")}` };
  }

  const jaExiste = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.email, email))
    .limit(1);
  if (jaExiste.length) {
    return { erro: "Já existe um usuário com este e-mail." };
  }

  await db.insert(usuarios).values({
    id: novoId("usr"),
    nome,
    email,
    cargo: cargo || null,
    papel,
    senhaHash: await hashSenha(senha),
    ativo: true,
  });

  revalidatePath("/config");
  return { ok: `Acesso de ${nome} criado.` };
}

/** Liga/desliga um acesso. Desligar derruba as sessões abertas da pessoa. */
export async function alternarAcesso(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id || id === admin.id) return;

  const linhas = await db.select().from(usuarios).where(eq(usuarios.id, id)).limit(1);
  const alvo = linhas[0];
  if (!alvo) return;

  const novoEstado = !alvo.ativo;
  await db.update(usuarios).set({ ativo: novoEstado }).where(eq(usuarios.id, id));

  if (!novoEstado) {
    await db.delete(sessoes).where(eq(sessoes.usuarioId, id));
  }

  revalidatePath("/config");
}

export async function trocarSenha(
  _estado: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const senha = String(formData.get("senha") ?? "");

  const forca = avaliarSenha(senha);
  if (!forca.ok) {
    return { erro: `Senha fraca: ${forca.problemas.join(" ")}` };
  }

  const linhas = await db.select().from(usuarios).where(eq(usuarios.id, id)).limit(1);
  if (!linhas[0]) return { erro: "Usuário não encontrado." };

  await db
    .update(usuarios)
    .set({ senhaHash: await hashSenha(senha) })
    .where(eq(usuarios.id, id));

  revalidatePath("/config");
  return { ok: "Senha atualizada." };
}

/** "Sair de todos os dispositivos" — quando a Layane acha que o acesso vazou. */
export async function revogarSessoes(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db.delete(sessoes).where(eq(sessoes.usuarioId, id));
  revalidatePath("/config");
}

/** A própria pessoa trocando a própria senha. */
export async function trocarMinhaSenha(
  _estado: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const eu = await requireAdmin();
  const atual = String(formData.get("atual") ?? "");
  const nova = String(formData.get("nova") ?? "");

  const forca = avaliarSenha(nova);
  if (!forca.ok) {
    return { erro: `Senha fraca: ${forca.problemas.join(" ")}` };
  }

  const linhas = await db.select().from(usuarios).where(eq(usuarios.id, eu.id)).limit(1);
  const euReal = linhas[0];
  if (!euReal || !(await verificarSenha(atual, euReal.senhaHash))) {
    return { erro: "Senha atual incorreta." };
  }

  await db
    .update(usuarios)
    .set({ senhaHash: await hashSenha(nova) })
    .where(eq(usuarios.id, eu.id));

  return { ok: "Sua senha foi atualizada." };
}
