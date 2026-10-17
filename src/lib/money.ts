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
  /* `arredondarCentavos`, e não `Math.round`: a multiplicação por 100 é
     justamente onde o meio se perde — "10,005" viraria 1000 em vez de
     1001. */
  return arredondarCentavos(n * 100);
}

/**
 * Arredonda para o centavo mais próximo.
 *
 * `Math.round` sozinho não basta, porque em IEEE 754 o "meio" não é
 * representável: `1.005 * 100` vale `100.49999999999999`, e o
 * `Math.round` cru devolve `100`. Um centavo a menos, justamente nos
 * valores que a regra existe para acertar.
 *
 * A correção é cirúrgica de propósito — só age quando o resto está a
 * menos de 1e-9 de 0,5, ou seja, quando a intenção era o meio exato.
 * Valores legítimos como `0,499` ou `0,501` passam intactos, e um
 * epsilon ingênuo aplicado a tudo deformaria centavos reais.
 */
export function arredondarCentavos(n: number): number {
  if (!Number.isFinite(n)) return 0;

  const resto = n - Math.trunc(n);
  if (Math.abs(resto - 0.5) < 1e-9) {
    /* Metade exata: "arredonda para cima" significa para +infinito,
       então -100,5 vira -100, não -101. */
    return Math.trunc(n) + (n < 0 ? 0 : 1);
  }

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