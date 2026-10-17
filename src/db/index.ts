/**
 * Conexão com o banco.
 *
 * Hoje é um arquivo SQLite local (`file:./data/layane.db`). Amanhã, se o
 * cliente crescer, basta trocar `DATABASE_URL` por `libsql://...` (Turso) e
 * apontar `DATABASE_AUTH_TOKEN` — nenhuma linha de código muda.
 */

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

import * as schema from "./schema";

const url = process.env.DATABASE_URL ?? "file:./data/layane.db";

/**
 * Cria a pasta do arquivo SQLite, se preciso.
 *
 * Este bloco é a diferença entre um build limpo e um build que embute o
 * projeto inteiro no servidor. Com `resolve(process.cwd(), ...)` a
 * linha dentro do `if` fica opaca para o analisador estático, que então
 * conclui que o código pode ler qualquer caminho e passa a copiar
 * TODO o repositório — inclusive `public/` e o `.env.local` — para o
 * output de produção.
 *
 * A correção é tornar o caminho literal quando ele é o padrão, e pular
 * o `mkdir` inteiro quando não é (ou seja, quando `DATABASE_URL` aponta
 * para o Turso, que não tem arquivo nenhum). O literal é lido em tempo
 * de build, o que dá ao analisador o que ele precisa.
 */
const CAMINHO_PADRAO = "./data/layane.db";

if (url === `file:${CAMINHO_PADRAO}`) {
  /* Caminho literal e uma constante: o analisador estático consegue
     resolver e rastreia só a pasta `data`. */
  const pasta = resolve(process.cwd(), "data");
  mkdirSync(pasta, { recursive: true });
} else if (url.startsWith("file:") && process.env.NODE_ENV !== "production") {
  /*
   * Caminho customizado vindo do ambiente. Em produção o `DATABASE_URL`
   * aponta para o Turso (`libsql://`), que não tem arquivo — e o
   * filesystem da Vercel é efêmero, então não há pasta a criar mesmo.
   */
  const caminho = resolve(process.cwd(), url.slice("file:".length));
  mkdirSync(dirname(caminho), { recursive: true });
}

export const client = createClient({
  url,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });

export * as tabelas from "./schema";
export type {
  Cliente,
  ClienteStatus,
  Demanda,
  DemandaStatus,
  Atendimento,
  Documento,
  Orcamento,
  OrcamentoItem,
  Contrato,
  Lancamento,
  Pagamento,
  Despesa,
  ModeloConformidade,
  Pergunta,
  Resposta,
  AnaliseConformidade,
  Usuario,
  Papel,
} from "./schema";