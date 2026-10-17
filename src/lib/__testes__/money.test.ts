/**
 * Dinheiro em centavos.
 *
 * Todo valor do sistema é inteiro de centavos. Isso não é estilo — é a
 * decisão que impede o erro clássico de `0.1 + 0.2 = 0.30000000000000004`
 * virar R$ 0,30 a mais na conciliação. Estes testes existem para
 * travar essa regra: se alguém introduzir `float` aqui, a suíte quebra.
 *
 * Nota sobre os espaços: `Intl.NumberFormat` em pt-BR separa o símbolo
 * da cifra com espaço não separável (U+00A0), não com espaço comum.
 * Comparar string direto daria falso negativo; por isso `texto()`.
 */

import { describe, expect, it } from "vitest";

import {
  arredondarCentavos,
  brl,
  brlCompacto,
  centavosParaCampo,
  paraCentavos,
  porcentagem,
  soma,
} from "@/lib/money";

/** Normaliza o espaço não separável para facilitar a comparação. */
const texto = (s: string) => s.replace(/\u00a0/g, " ");

describe("paraCentavos", () => {
  it("converte string de formulário em centavos", () => {
    // O formulário manda "1.500,50" no padrão brasileiro.
    expect(paraCentavos("1.500,50")).toBe(150_050);
  });

  it("entende que número solto é em reais, não centavos", () => {
    /* "150050" digitado no campo significa R$ 150.050,00 — não 150.050
       centavos. O campo pede reais; a conversão para centavo é interna.
       Este teste existe porque a leitura contrária daria erro de 100x. */
    expect(paraCentavos("150050")).toBe(15_005_000);
  });

  it("entende zero", () => {
    expect(paraCentavos("0")).toBe(0);
  });

  it("entende centavos sem parte inteira", () => {
    expect(paraCentavos("0,99")).toBe(99);
  });

  it("aceita valor já com o símbolo", () => {
    expect(paraCentavos("R$ 1.500,50")).toBe(150_050);
  });

  it("entende ponto como decimal quando tem até duas casas", () => {
    expect(paraCentavos("1234.56")).toBe(123_456);
  });

  it("entende ponto como separador de milhar quando tem três casas", () => {
    expect(paraCentavos("1.234")).toBe(123_400);
  });

  it("devolve null para campo em branco", () => {
    /* Campo vazio não é R$ 0,00 — é ausência de valor. Confundir os
       dois transformaria "ainda não preenchi" em "não deve nada". */
    expect(paraCentavos("")).toBeNull();
    expect(paraCentavos("   ")).toBeNull();
    expect(paraCentavos(null)).toBeNull();
    expect(paraCentavos(undefined)).toBeNull();
  });

  it("devolve null para o que não é número", () => {
    expect(paraCentavos("abc")).toBeNull();
  });

  it("não deixa o centsIMAL escolhido virar float na conversão", () => {
    /* 10,005 em reais são 1000,5 centavos. Em ponto flutuante puro,
       10.005 * 100 dá 1000,4999999999999 e arredonda para 1000 — um
       centavo a menos, todos os meses, em toda conta com fração. */
    expect(paraCentavos("10,005")).toBe(1001);
  });
});

describe("centavosParaCampo", () => {
  it("formata para o padrão brasileiro, com separador de milhar", () => {
    expect(centavosParaCampo(150_050)).toBe("1.500,50");
  });

  it("formata valor pequeno sem separador", () => {
    expect(centavosParaCampo(500)).toBe("5,00");
  });

  it("devolve string vazia para null, não zero", () => {
    expect(centavosParaCampo(null)).toBe("");
  });
});

describe("brl", () => {
  it("formata com o símbolo e o separador brasileiro", () => {
    expect(texto(brl(150_050))).toBe("R$ 1.500,50");
  });

  it("formata zero", () => {
    expect(texto(brl(0))).toBe("R$ 0,00");
  });

  it("não quebra com null", () => {
    expect(texto(brl(null))).toBe("R$ 0,00");
  });

  it("formata valor negativo", () => {
    /* Desconto entra como valor negativo. Se a formatação engasgar
       aqui, o desconto some da tela de financeiro. */
    expect(texto(brl(-5_000))).toBe("-R$ 50,00");
  });
});

describe("arredondarCentavos", () => {
  it("arredonda meio centavo para cima", () => {
    expect(arredondarCentavos(100.5)).toBe(101);
  });

  it("mantém inteiro intacto", () => {
    expect(arredondarCentavos(100)).toBe(100);
  });

  it("limpa o erro de ponto flutuante na fronteira do meio", () => {
    /* 1.005 * 100 vale 100.49999999999999 em IEEE 754, não 100.5. O
       Math.round cru devolve 100 — um centavo a menos — exatamente no
       valor que a função existe para acertar. */
    expect(arredondarCentavos(1.005 * 100)).toBe(101);
  });

  it("limpa o erro acumulado de soma de decimais", () => {
    expect(arredondarCentavos(0.1 + 0.2)).toBe(0);
    expect(arredondarCentavos(10.005 * 100)).toBe(1001);
  });

  it("arredonda meio para cima também nos negativos", () => {
    /* -100,5 tem que virar -100, não -101: arredondar "para cima" em
       número negativo significa tirar o meio. */
    expect(arredondarCentavos(-100.5)).toBe(-100);
  });
});

describe("soma", () => {
  it("soma ignorando nulos", () => {
    expect(soma([100, null, 250, undefined])).toBe(350);
  });

  it("soma lista vazia como zero", () => {
    expect(soma([])).toBe(0);
  });

  it("soma todos nulos como zero, sem virar NaN", () => {
    expect(soma([null, undefined])).toBe(0);
  });
});

describe("porcentagem", () => {
  it("calcula a proporção", () => {
    expect(porcentagem(25, 100)).toBe(25);
  });

  it("devolve zero quando o total é zero", () => {
    /* Dividir por zero dá NaN, e NaN na tela vira "NaN%". Aqui a
       resposta honesta é 0%. */
    expect(porcentagem(10, 0)).toBe(0);
  });
});

describe("brlCompacto", () => {
  it("encurta valor grande para caber em eixo de gráfico", () => {
    expect(brlCompacto(1_500_000).length).toBeLessThan(brl(1_500_000).length);
  });

  it("mantém valor pequeno legível", () => {
    expect(texto(brlCompacto(500_00))).toContain("500");
  });
});
