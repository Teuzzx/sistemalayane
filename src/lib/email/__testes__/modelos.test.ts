/**
 * Texto das mensagens.
 *
 * O foco aqui é o que dá problema real: alguém escreve `{{cliente_nome}}`,
 * o nome entra no HTML sem escape e vira injeção no e-mail de terceiro.
 * A segunda preocupação é o placeholder silenciosamente vazio — que
 * produz um e-mail "Olá, !" sem ninguém perceber por que ficou estranho.
 */

import { describe, expect, it } from "vitest";

import {
  ASSUNTOS,
  MODELO_VAZIO,
  TEXTOS,
  VARIAVEIS_POR_TIPO,
  escaparHtml,
  extrairVariaveis,
  interpolar,
  textoParaHtml,
  type tipoMensagem,
} from "@/lib/email/modelos";

const TIPOS: tipoMensagem[] = [
  "cobranca",
  "contrato",
  "orcamento",
  "conformidade",
  "documento",
  "aviso",
  "atendimento",
];

describe("interpolar", () => {
  it("troca o placeholder pelo valor", () => {
    expect(interpolar("Olá, {{cliente_nome}}!", { cliente_nome: "Ana" })).toBe(
      "Olá, Ana!",
    );
  });

  it("troca vários de uma vez", () => {
    const r = interpolar("{{a}} e {{b}}", { a: "1", b: "2" });
    expect(r).toBe("1 e 2");
  });

  it("aceita espaços dentro das chaves", () => {
    expect(interpolar("{{ cliente_nome }}", { cliente_nome: "Ana" })).toBe("Ana");
  });

  it("não diferencia maiúscula da chave", () => {
    expect(interpolar("{{VALOR}}", { valor: "10" })).toBe("10");
  });

  it("repete o mesmo placeholder as vezes que aparecer", () => {
    const r = interpolar("{{n}} {{n}} {{n}}", { n: "x" });
    expect(r).toBe("x x x");
  });

  it("DEIXA o placeholder intacto quando o valor não foi fornecido", () => {
    /* O comportamento oposto — virar string vazia — produz um e-mail
       "Olá, !" que chega no cliente sem nenhum sinal do que faltou.
       Ver o texto quebrado é autoexplicativo. */
    expect(interpolar("Olá, {{cliente_nome}}!", {})).toBe(
      "Olá, {{cliente_nome}}!",
    );
  });

  it("substitui por vazio quando o valor É vazio", () => {
    /* Aqui a diferença é deliberada: a Layane mandou o campo em branco,
       então some da tela dela também. */
    expect(interpolar("[{{obs}}]", { obs: "" })).toBe("[]");
  });

  it("não confunde placeholder com texto normal", () => {
    const r = interpolar("preço: {valor} e {a,b}", { valor: "10" });
    expect(r).toBe("preço: {valor} e {a,b}");
  });

  it("não mexe em texto sem placeholder", () => {
    expect(interpolar("texto puro", { a: "b" })).toBe("texto puro");
  });
});

describe("escaparHtml", () => {
  it("neutraliza a tag de script", () => {
    expect(escaparHtml("<script>alert(1)</script>")).not.toContain("<script>");
  });

  it("neutraliza aspas, que abrem atributo", () => {
    const r = escaparHtml('" onload="alert(1)');
    expect(r).toBe("&quot; onload=&quot;alert(1)");
  });

  it("escapa o e comercial antes dos outros, sem duplicar escape", () => {
    /* Se o & fosse escapado por último, "&lt;" viraria "&amp;lt;" e a
       tag reapareceria na tela. A ordem aqui é load-bearing. */
    expect(escaparHtml("<")).toBe("&lt;");
    expect(escaparHtml("&")).toBe("&amp;");
    expect(escaparHtml("&lt;")).toBe("&amp;lt;");
  });

  it("escapa apostrofo, que fecha atributo de aspas simples", () => {
    expect(escaparHtml("'")).toBe("&#39;");
  });
});

describe("textoParaHtml", () => {
  it("escapa o conteúdo antes de gerar as tags", () => {
    /* Este é o teste que fecha a porta da injeção: o valor entra pelo
       `interpolar`, e se escapar tarde demais, a tag já virou nó do DOM. */
    const html = textoParaHtml("olá <b>Ana</b>");
    expect(html).toContain("&lt;b&gt;");
    expect(html).not.toContain("<b>Ana</b>");
  });

  it("transforma parágrafo em <p>", () => {
    expect(textoParaHtml("primeiro\n\nsegundo")).toContain("<p>");
  });

  it("transforma lista com marcador em <ul>", () => {
    const html = textoParaHtml("- um\n- dois");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>um</li>");
  });

  it("transforma negrito em <strong>", () => {
    expect(textoParaHtml("**valor**")).toContain("<strong>valor</strong>");
  });

  it("transforma itálico em <em>", () => {
    expect(textoParaHtml("olá _por aqui_").replace(/^/, "")).toContain(
      "<em>por aqui</em>",
    );
  });

  it("devolve vazio para texto vazio", () => {
    expect(textoParaHtml("")).toBe("");
  });
});

describe("extrairVariaveis", () => {
  it("acha as variáveis usadas no texto", () => {
    expect(extrairVariaveis("{{cliente_nome}} e {{valor}}")).toEqual([
      "cliente_nome",
      "valor",
    ]);
  });

  it("não repete variável usada duas vezes", () => {
    expect(extrairVariaveis("{{a}} {{a}}")).toEqual(["a"]);
  });

  it("devolve lista vazia para texto sem variável", () => {
    expect(extrairVariaveis("texto")).toEqual([]);
  });
});

describe("os textos que a Layane vai ler", () => {
  it("todo tipo tem assunto preenchido", () => {
    for (const t of TIPOS) {
      expect(ASSUNTOS[t].trim().length).toBeGreaterThan(8);
    }
  });

  it("todo tipo tem corpo com pelo menos uma variável", () => {
    /* O assunto não precisa de variável — "Aviso importante" é um bom
       assunto. O corpo precisa, senão o e-mail sai genérico demais. */
    for (const t of TIPOS) {
      expect(extrairVariaveis(TEXTOS[t]).length).toBeGreaterThan(0);
    }
  });

  it("todo tipo tem corpo com texto", () => {
    for (const t of TIPOS) {
      expect(TEXTOS[t].length).toBeGreaterThan(40);
    }
  });

  it("todo tipo tem modelo em branco para editar", () => {
    for (const t of TIPOS) {
      expect(MODELO_VAZIO[t].length).toBeGreaterThan(0);
    }
  });

  it("toda variável documentada existe no texto daquele tipo", () => {
    /* Se a documentação de um modelo citar uma variável que o texto não
       usa, a Layane digita `{{prazo}}` achando que funciona e o
       placeholder sai literally no e-mail do cliente. */
    for (const t of TIPOS) {
      const usadas = new Set(extrairVariaveis(TEXTOS[t]));
      for (const v of VARIAVEIS_POR_TIPO[t]) {
        expect(usadas.has(v)).toBe(true);
      }
    }
  });

  it("toda variável usada no texto está documentada", () => {
    /* E o inverso: variável no texto sem documentação some da ajuda. */
    for (const t of TIPOS) {
      const documentadas = new Set(VARIAVEIS_POR_TIPO[t]);
      for (const v of extrairVariaveis(TEXTOS[t])) {
        expect(documentadas.has(v)).toBe(true);
      }
    }
  });

  it("a cobrança sempre cita valor e vencimento", () => {
    /* São os dois dados que o cliente precisa para pagar. Sem eles o
       e-mail vira um "olá, está chegando sua cobrança" sem informação. */
    const usadas = extrairVariaveis(TEXTOS.cobranca);
    expect(usadas).toContain("valor");
    expect(usadas).toContain("vencimento");
  });

  it("nenhum texto padrão usa palavra de robô de banco", () => {
    /* A Layane descreveu o tom dela no pedido: atendimento direto, sem
       "prezado cliente". Se alguém colar um texto genérico aqui, esse
       teste avisa. */
    for (const t of TIPOS) {
      expect(TEXTOS[t]).not.toMatch(/prezado|caro cliente|atenciosamente/i);
    }
  });
});
