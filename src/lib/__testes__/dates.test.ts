/**
 * Datas.
 *
 * O sistema inteiro grava data como `YYYY-MM-DD` em texto. Isso evita o
 * deslocamento de fuso que faria um boleto vencer "ontem", mas cobra um
 * preço: não existe `new Date("2026-03-01")` confiável, porque o
 * JavaScript interpreta isso como meia-noite **local**.
 *
 * Estes testes existem para travar esse acordo: toda aritmética de data
 * tem que passar por `Date.parse(...T00:00:00Z)`, nunca por `new Date`
 * com string de data pura.
 */

import { describe, expect, it } from "vitest";

import {
  dataExtensoLonga,
  diferencaDias,
  formatarData,
  hoje,
  janelaMeses,
  paraISO,
  rotuloMesChave,
  somaDias,
  somaMeses,
} from "@/lib/dates";

describe("paraISO", () => {
  it("formata no padrão do sistema", () => {
    expect(paraISO(new Date(2026, 2, 1))).toBe("2026-03-01");
  });

  it("preenche mês e dia com dois dígitos", () => {
    /* Sem o preenchimento, "2026-3-1" não casa com comparação de
       string nenhuma e some do filtro de período. */
    expect(paraISO(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("somaDias", () => {
  it("soma dias dentro do mês", () => {
    expect(somaDias("2026-03-01", 10)).toBe("2026-03-11");
  });

  it("vira o mês", () => {
    expect(somaDias("2026-03-25", 10)).toBe("2026-04-04");
  });

  it("vira o ano", () => {
    expect(somaDias("2026-12-25", 10)).toBe("2027-01-04");
  });

  it("volta no tempo com dias negativos", () => {
    expect(somaDias("2026-03-10", -10)).toBe("2026-02-28");
  });

  it("salta o ano痕 com dias negativos", () => {
    expect(somaDias("2026-01-05", -10)).toBe("2025-12-26");
  });

  it("não escorrega de dia 31 para o mês seguinte", () => {
    expect(somaDias("2026-01-31", 1)).toBe("2026-02-01");
  });

  it("atravessa o 29 de fevereiro em ano bissexto", () => {
    /* 2028 é bissexto. O dia 28 + 1 tem que virar 29, não 1º de março
       — é a virada que o `setDate` resolve sozinho, mas que quebra se
       alguém trocar a implementação por aritmética de string. */
    expect(somaDias("2028-02-28", 1)).toBe("2028-02-29");
    expect(somaDias("2028-02-29", 1)).toBe("2028-03-01");
  });

  it("pula de 28 para 1º de março em ano não bissexto", () => {
    expect(somaDias("2026-02-28", 1)).toBe("2026-03-01");
  });
});

describe("somaMeses", () => {
  it("soma meses dentro do ano", () => {
    expect(somaMeses("2026-03-01", 3)).toBe("2026-06-01");
  });

  it("soma meses virando o ano", () => {
    expect(somaMeses("2026-11-15", 3)).toBe("2027-02-15");
  });

  it("não estoura o último dia do mês", () => {
    /* Somar 1 mês em 31 de janeiro tem que dar 28/29 de fevereiro, não
       2 ou 3 de março. É o bug clássico de "ano novo, fatura nova". */
    expect(somaMeses("2026-01-31", 1)).toBe("2026-02-28");
  });

  it("funciona com meses negativos", () => {
    expect(somaMeses("2026-03-15", -3)).toBe("2025-12-15");
  });
});

describe("diferencaDias", () => {
  it("conta dias entre duas datas", () => {
    expect(diferencaDias("2026-03-01", "2026-03-08")).toBe(7);
  });

  it("devolve negativo quando a segunda é anterior", () => {
    expect(diferencaDias("2026-03-08", "2026-03-01")).toBe(-7);
  });

  it("devolve zero para a mesma data", () => {
    expect(diferencaDias("2026-03-01", "2026-03-01")).toBe(0);
  });

  it("não escorrega por causa de horário de verão", () => {
    /*-start do horário de verão brasileiro, o "dia" tem 23 horas e a
       subtração ingênua devolve 6 dias e 23 horas → arredonda para 7.
       Aqui tem que dar exatamente 1. */
    expect(diferencaDias("2026-10-18", "2026-10-19")).toBe(1);
  });

  it("atravessa a virada de ano", () => {
    expect(diferencaDias("2025-12-31", "2026-01-01")).toBe(1);
  });
});

describe("formatarData", () => {
  it("formata no padrão brasileiro", () => {
    expect(formatarData("2026-03-01")).toMatch(/01.*03.*2026/);
  });

  it("não quebra com data vazia", () => {
    expect(() => formatarData(null)).not.toThrow();
    expect(() => formatarData(undefined)).not.toThrow();
  });

  it("não quebra com lixo no lugar da data", () => {
    /* Dado sujo vem de importação. "Invalid Date" na tela é pior que
       um traço, porque parece erro do sistema. */
    expect(() => formatarData("não é data")).not.toThrow();
  });
});

describe("dataExtensoLonga", () => {
  it("escreve a data por extenso", () => {
    const r = dataExtensoLonga("2026-03-01").toLowerCase();
    expect(r).toContain("mar");
    expect(r).toContain("2026");
  });

  it("não quebra com data vazia", () => {
    expect(() => dataExtensoLonga(null)).not.toThrow();
  });
});

describe("rotuloMesChave", () => {
  it("traduz a chave de mês para o nome", () => {
    expect(rotuloMesChave("2026-03")).toMatch(/mar/i);
  });
});

describe("janelaMeses", () => {
  it("devolve a quantidade pedida, terminando no mês informado", () => {
    const j = janelaMeses(6, "2026-06-01");
    expect(j).toHaveLength(6);
    expect(j[5]).toBe("2026-06");
  });

  it("começa mais atrás quando pede mais meses", () => {
    expect(janelaMeses(3, "2026-06-01")[0]).toBe("2026-04");
  });

  it("atravessa a virada de ano", () => {
    expect(janelaMeses(3, "2026-01-01")[0]).toBe("2025-11");
  });
});

describe("hoje", () => {
  it("devolve a data no padrão do sistema", () => {
    expect(hoje()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("devolve a data local, não a de UTC", () => {
    /* `toISOString()` aqui marcaria a data de amanhã para quem trabalha
       à noite no Brasil. */
    const agora = new Date();
    const esperado = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}`;
    expect(hoje()).toBe(esperado);
  });
});
