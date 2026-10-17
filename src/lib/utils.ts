import { type SQL, sql } from "drizzle-orm";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...entradas: ClassValue[]): string {
  return twMerge(clsx(entradas));
}

/** Só dígitos — para telefone, CNPJ, CEP. */
export function somenteDigitos(valor: string): string {
  return (valor ?? "").replace(/\D/g, "");
}

/** `(86) 99509-9210` a partir de `5586995099210` ou de `8699509921`. */
export function mascararTelefone(valor: string | null | undefined): string {
  const d = somenteDigitos(valor ?? "");
  if (!d) return "—";
  const local = d.length > 10 ? d.slice(2) : d;
  if (local.length <= 2) return local;
  if (local.length <= 6) return `(${local.slice(0, 2)}) ${local.slice(2)}`;
  if (local.length <= 10) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  }
  return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
}

/** `12.345.678/0001-90` a partir de dígitos. Aceita CPF e CNPJ. */
export function mascararDocumento(valor: string | null | undefined): string {
  const d = somenteDigitos(valor ?? "");
  if (d.length === 11) {
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  if (d.length === 14) {
    return d.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      "$1.$2.$3/$4-$5",
    );
  }
  return valor || "—";
}

export function iniciais(nome: string): string {
  const partes = (nome ?? "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

/** Primeira palavra em maiúscula, sem mexer no resto. */
export function capitalizar(texto: string): string {
  if (!texto) return "";
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** `Até 12/2026` a partir de um ISO. */
export function mesAno(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [, m, y] = iso.slice(0, 7).split("-");
  return `${m}/${y}`;
}

/** Plural simples: `pluralizar(1, "cliente", "clientes")`. */
export function pluralizar(n: number, um: string, muitos: string): string {
  return `${n} ${n === 1 ? um : muitos}`;
}

/**
 * Remove acentos e minúsculas — para busca tolerante: "sao paulo" acha
 * "São Paulo", "saude" acha "saúde".
 *
 * Aceita `unknown` de propósito: quando é chamado dentro de um template
 * `sql` do Drizzle, o argumento é a própria coluna, e o resultado é
 * descartado pelo driver — só importa que ele entre como referência de
 * coluna e não como string literal.
 */
export function normalizar(texto: unknown): string {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Versão para uso DENTRO de um template `sql` do Drizzle.
 *
 * O `normalizar()` acima não serve aqui, e a diferença é o motivo de esta
 * função existir. Numa query, o Drizzle trata cada interpolação de três
 * jeitos: se for um `SQL`, cola o SQL; se for uma `Column`, escreve a
 * referência da coluna; qualquer outra coisa vira PARÂMETRO ligado.
 *
 * `normalizar(clientes.nome)` devolve uma string, então caía no terceiro
 * caso e a consulta saía como `where ($1 like $2)` — comparando a string
 * `'[object object]'` com o termo digitado. Compilava, não reclamava, e
 * a busca não trazia nada.
 *
 * Aqui a coluna volta para o Drizzle como coluna, e a remoção de acento
 * acontece dentro do Postgres, via `unaccent`. Precisa da extensão:
 *
 *     create extension if not exists unaccent;
 */
export function semAcento(coluna: unknown) {
  return sql`unaccent(lower(${coluna as SQL}))`;
}