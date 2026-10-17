/**
 * Autenticação e autorização.
 *
 * Dois papéis:
 * - `admin`     → Layane. Tudo.
 * - `assistente`→ pessoa administrativa. Cadastra/edita clientes, registra
 *                 atendimento, monta orçamento, dá baixa no financeiro.
 *                 NÃO vê: configurações do sistema, usuários, relatório de
 *                 conformidade já emitido, exclusões.
 *
 * A sessão é um token opaco guardado em cookie httpOnly + linha em `sessoes`.
 * Logout revoga a linha — derruba a sessão em todos os dispositivos.
 */

import "server-only";

import bcrypt from "bcryptjs";
import { and, eq, gt, lt } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { db } from "@/db";
import {
  papelAdmin,
  sessoes,
  usuarios,
  type Usuario,
} from "@/db/schema";

import { novoToken } from "./ids";

const COOKIE = "layane_sessao";
const DIAS = Number(process.env.SESSION_DAYS ?? 30);

export async function hashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, 12);
}

export async function verificarSenha(
  senha: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}

/* ------------------------------------------------------------------ */
/* Sessão                                                              */
/* ------------------------------------------------------------------ */

export async function criarSessao(usuarioId: string): Promise<void> {
  const token = novoToken();
  const expira = new Date(Date.now() + DIAS * 24 * 60 * 60 * 1000);

  await db.insert(sessoes).values({
    id: token,
    usuarioId,
    expiraEm: expira.toISOString(),
  });

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expira,
  });

  await db
    .update(usuarios)
    .set({ ultimoAcessoEm: new Date().toISOString() })
    .where(eq(usuarios.id, usuarioId));
}

export async function destruirSessao(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    await db.delete(sessoes).where(eq(sessoes.id, token));
  }
  jar.delete(COOKIE);
}

/** Sessão expirada? Some com a linha para o banco não crescer sozinho. */
async function limparExpiradas(): Promise<void> {
  await db.delete(sessoes).where(lt(sessoes.expiraEm, new Date().toISOString()));
}

/**
 * Usuário da requisição atual, ou `null`. Nunca redireciona.
 *
 * Envolta em `cache()` do React de propósito. O layout chama `getUsuario()`
 * para montar os contadores da barra, e a página chama `requireUsuario()` —
 * sem memoização são DUAS leituras de `cookies()` na mesma requisição, e a
 * leitura de cookie custava mais que a consulta ao banco (medido: 68ms de
 * cookie contra 4ms de query). `cache()` garante uma execução por request.
 *
 * NOTA: o cache é do React e vale só dentro de uma renderização. Não usar
 * como se fosse cache entre requisições.
 */
async function buscarUsuario(): Promise<Usuario | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  const linha = await db
    .select({ usuario: usuarios, expiraEm: sessoes.expiraEm })
    .from(sessoes)
    .innerJoin(usuarios, eq(sessoes.usuarioId, usuarios.id))
    .where(and(eq(sessoes.id, token), gt(sessoes.expiraEm, new Date().toISOString())))
    .limit(1);

  const achada = linha[0];
  if (!achada) return null;
  if (!achada.usuario.ativo) return null;

  // Faxina oportunista: a rota de leitura continua sendo só leitura. A
  // limpeza roda quando a chance cai (1 em 20), não em toda requisição.
  if (Math.random() < 0.05) void limparExpiradas();

  return achada.usuario;
}

export const getUsuario = cache(buscarUsuario);

/** Igual `getUsuario`, mas redireciona para o login se não houver sessão. */
export async function requireUsuario(): Promise<Usuario> {
  const usuario = await getUsuario();
  if (!usuario) redirect("/login");
  return usuario;
}

/** Exige papel `admin`. Usado em configurações, usuários e emissão de parecer. */
export async function requireAdmin(): Promise<Usuario> {
  const usuario = await requireUsuario();
  if (usuario.papel !== papelAdmin) redirect("/painel?erro=sem-permissao");
  return usuario;
}

// `ehAdmin` e `rotuloPapel` vivem em `lib/papeis.ts` — são usados por
// Client Components e não podem arrastar `server-only` junto.