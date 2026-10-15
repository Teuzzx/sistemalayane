/**
 * Dinheiro — centavos em, texto legível para fora.
 *
 * Regra do projeto: nada de float. Todo valor que entra no banco é
 * `integer` de centavos. A conversão para float acontece só na hora de
 * formatar, e sempre voltando por `arredondarCentavos`.
 */

const REAL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const REAL_COMPACTO = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** `123456` → `"R$ 1.234,56"`. */
export function brl(centavos: number | null | undefined): string {
  return REAL.format((centavos ?? 0) / 100);
}

/** Versão curta para cartões do painel: `"R$ 12,3 mil"`. */
export function brlCompacto(centavos: number | null | undefined): string {
  const v = (centavos ?? 0) / 100;
  if (Math.abs(v) < 10_000) return REAL.format(v);
  return REAL_COMPACTO.format(v);
}

/**
 * Aceita o que a pessoa digita: `"1.234,56"`, `"1234,56"`, `"1234.56"`,
 * `"1234"` ou `"R$ 1.234,56"`. Vira centavos. `null` quando não dá.
 */
export function paraCentavos(entrada: string | number | null | undefined): number | null {
  if (entrada === null || entrada === undefined || entrada === "") return null;
  if (typeof entrada === "number") return arredondarCentavos(Math.round(entrada * 100));

  let s = String(entrada).trim().replace(/[R$\s ]/g, "");
  if (!s) return null;

  const temPonto = s.includes(".");
  const temVirgula = s.includes(",");

  if (temVirgula) {
    // Vírgula é o separador decimal brasileiro. Remove ponto de milhar.
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (temPonto) {
    // Só ponto: decimal se tiver 1–2 dígitos depois, senão é milhar.
    const partes = s.split(".");
    if (partes.length > 2 || partes[partes.length - 1].length > 2) {
      s = s.replace(/\./g, "");
    }
  }

  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return arredondarCentavos(Math.round(n * 100));
}

/** Evita `0.1 + 0.2` virando `30000000000000004`. */
export function arredondarCentavos(n: number): number {
  return Math.round(n);
}

/** `55000` → `55.000,00` — para Inputs que guardam centavos. */
export function centavosParaCampo(centavos: number | null | undefined): string {
  if (centavos === null || centavos === undefined) return "";
  return (centavos / 100)
    .toFixed(2)
    .replace(".", ",")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Soma com segurança quando a coluna pode ser `null`. */
export function soma(values: (number | null | undefined)[]): number {
  return values.reduce<number>((acc, v) => acc + (v ?? 0), 0);
}

/** Percentual sobre um total, arredondado para centavos. */
export function porcentagem(parte: number, total: number): number {
  if (!total) return 0;
  return Math.round((parte / total) * 100);
}