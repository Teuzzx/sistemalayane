/**
 * Regra comercial — o cálculo que vira dinheiro na rua.
 *
 * Duas invariantes que estes testes travam:
 *
 * 1. **A soma das parcelas é igual ao total.** Arredondar parcela por
 *    parcela sempre perde ou inventa centavos; a regra aqui é absorver
 *    o resto na primeira parcela, que é a única que fecha a conta.
 * 2. **Item vazio não vira linha.** Um item sem descrição que fica
 *    na tabela suja o orçamento e o valor total.
 */

import { describe, expect, it } from "vitest";

import { calcularTotais, repartir } from "@/lib/comercial";
import type { OrcamentoItem } from "@/db/schema";

const item = (
  descricao: string,
  quantidade: number,
  valorUnitario: number,
): OrcamentoItem => ({ descricao, quantidade, valorUnitario }) as OrcamentoItem;

describe("repartir", () => {
  it("divide em parcelas iguais", () => {
    expect(repartir(100_000, 4)).toEqual([25_000, 25_000, 25_000, 25_000]);
  });

  it("mantém a soma exatamente igual ao total", () => {
    /* 1000 em 3 partes não é inteiro: 333,33 × 3 = 999,99. O centavo que
       falta tem que aparecer em algum lugar, e o place é a primeira
       parcela. Sem isso o contrato "some" um centavo. */
    const parcelas = repartir(1000, 3);
    expect(parcelas.reduce((s, p) => s + p, 0)).toBe(1000);
  });

  it("coloca o resto na primeira parcela", () => {
    expect(repartir(1000, 3)).toEqual([334, 333, 333]);
  });

  it("funciona com valor não divisível por número grande", () => {
    const parcelas = repartir(100_001, 7);
    expect(parcelas).toHaveLength(7);
    expect(parcelas.reduce((s, p) => s + p, 0)).toBe(100_001);
  });

  it("devolve uma parcela só quando pedem zero", () => {
    expect(repartir(500, 0)).toEqual([500]);
  });

  it("devolve uma parcela só quando pedem negativo", () => {
    expect(repartir(500, -3)).toEqual([500]);
  });

  it("não devolve parcela vazia", () => {
    expect(repartir(500, 1)).toEqual([500]);
  });

  it("lida com total zero sem virar NaN", () => {
    expect(repartir(0, 3)).toEqual([0, 0, 0]);
  });
});

describe("calcularTotais", () => {
  it("soma quantidade vezes valor unitário", () => {
    const r = calcularTotais([item("Laudo", 2, 50_000)]);
    expect(r.subtotal).toBe(100_000);
  });

  it("soma vários itens", () => {
    const r = calcularTotais([
      item("Laudo", 2, 50_000),
      item("Visita", 1, 80_000),
    ]);
    expect(r.subtotal).toBe(180_000);
  });

  it("ignora item sem descrição", () => {
    const r = calcularTotais([
      item("Laudo", 1, 50_000),
      item("   ", 3, 10_000),
    ]);
    expect(r.subtotal).toBe(50_000);
    expect(r.itens).toHaveLength(1);
  });

  it("trata quantidade zero como zero, não como ausente", () => {
    const r = calcularTotais([item("Laudo", 0, 50_000)]);
    expect(r.subtotal).toBe(0);
  });

  it("recusa quantidade negativa", () => {
    /* Quantidade negativa com valor unitário positivo geraria subtotal
       negativo — um desconto fantasma que a Layane não autorizou. */
    const r = calcularTotais([item("Laudo", -2, 50_000)]);
    expect(r.subtotal).toBe(0);
  });

  it("recusa valor unitário negativo", () => {
    const r = calcularTotais([item("Laudo", 2, -50_000)]);
    expect(r.subtotal).toBe(0);
  });

  it("aplica desconto percentual sobre o subtotal", () => {
    const r = calcularTotais([item("Laudo", 1, 100_000)], 10);
    expect(r.descontoTotal).toBe(10_000);
    expect(r.total).toBe(90_000);
  });

  it("aplica desconto em valor fixo", () => {
    const r = calcularTotais([item("Laudo", 1, 100_000)], 0, 15_000);
    expect(r.descontoTotal).toBe(15_000);
    expect(r.total).toBe(85_000);
  });

  it("não deixa o total ficar negativo com desconto maior que o subtotal", () => {
    /* Total negativo viraria lançamento negativo no financeiro, que o
       sistema lida como pagamento. Desconto acima do subtotal é erro
       de digitação, e o piso tem de ser zero. */
    const r = calcularTotais([item("Laudo", 1, 10_000)], 0, 50_000);
    expect(r.total).toBe(0);
  });

  it("trata lista vazia como zero, sem NaN", () => {
    const r = calcularTotais([]);
    expect(r.subtotal).toBe(0);
    expect(r.total).toBe(0);
    expect(Number.isNaN(r.total)).toBe(false);
  });

  it("mantém o total em centavos inteiros depois do desconto", () => {
    /* 33% de 999 são 329,67 — que precisam virar 330, senão o total
       carregaria uma fração de centavo para dentro do cronograma de
       parcelas. O total final é 999 - 330 = 669. */
    const r = calcularTotais([item("Laudo", 1, 999)], 33);
    expect(Number.isInteger(r.descontoTotal)).toBe(true);
    expect(Number.isInteger(r.total)).toBe(true);
    expect(r.descontoTotal).toBe(330);
    expect(r.total).toBe(669);
  });
});
