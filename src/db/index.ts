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

/** O driver do libSQL não cria a pasta do arquivo — criamos aqui. */
if (url.startsWith("file:")) {
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