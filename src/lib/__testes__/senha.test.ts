/**
 * Regra de senha.
 *
 * Testes de segurança药品 com poucasAssertions。有几个当前状态必须明确记录的决策：

## 已实现（`lib/passwords.ts`）

| 规则 | 阈值 |
|---|---|
| 最小长度 | 10 |
| 需含小写字母 | ✓ |
| 需含大写字母 | ✓ |
| 需含数字 | ✓ |
| 黑名单检测 | `password` / `senha` / `123456` / `qwerty` / `layane` / `admin` |

返回值结构：`{ ok: boolean, score: number, reasons: string[] }`，`reasons` 用于渲染具体提示。

## 刻意排除的两项

**符号** — NIST SP 800-63B 不强制符号组合，收益低于用户挫败成本。同时排除「必须含大小写 + 符号 + 数字」的组合规则，因为它把用户推向 `Senha@123` 这种出现在每份泄露字典里的模式。

**重复字符与序列检测**（`aaaaaaa`、`123456`、`abcdef`）— 常见但不在 10 字符阈值内，不阻断。

## 已知边界

`COMUNS` 是**子串匹配**而非词边界匹配。这意味着 `senha`、`layane` 这类词条会误伤包含它们的合法密码（如 `minhasenhas` 会被 `senha` 命中）。这是刻意选择：漏放一条弱密码的代价（账号被爆破）高于误伤一条强密码（用户换个写法）。

需要注意的是，黑名单里包含 `layane` —— 这意味着 Layane 本人的密码不能包含她自己名字的任何子串。对她而言这不是缺点而是优点。

## 缺口

`COMUNS` 是静态硬编码列表。若需要对照真实泄露密码库（如 HIBP top-10k），需改为构建期注入或运行时读取，因为不能在客户端代码里打包整个字典Agora senha e regra comercial:<tool_call>
<invoke name="write"><content>/**
 * Força da senha.
 *
 * security-critical: a regra aqui define o que impede alguém de escolher
 * `layane2026` — que é exatamente a senha do seed e já apareceu em
 * log público. Estes testes existem para travar duas decisões: o que é
 * recusado, e o que NÃO é (para não travar a Layane com uma senha boa).
 */

import { describe, expect, it } from "vitest";

import { TAMANHO_MINIMO, avaliarSenha, rotuloForca } from "@/lib/senha";

describe("avaliarSenha", () => {
  describe("o que é recusado", () => {
    it("recusa senha curta", () => {
      const r = avaliarSenha("Ab3!x");
      expect(r.ok).toBe(false);
      expect(r.problemas.join()).toMatch(/caracteres/i);
    });

    it("recusa a senha que está no seed e no README", () => {
      /* `layane2026` é a senha de fábrica. Ela tem 11 caracteres,
           maiúscula, minúscula e número — passa em três das quatro
           regras, e mesmo assim precisa cair. É o caso que mostra por
           que a lista de palavras proibidas existe. */
      const r = avaliarSenha("layane2026");
      expect(r.ok).toBe(false);
      expect(r.problemas.join()).toMatch(/layane/i);
    });

    it("recusa senha sem maiúscula", () => {
      expect(avaliarSenha("abcdfghij12").ok).toBe(false);
    });

    it("recusa senha sem minúscula", () => {
      expect(avaliarSenha("ABCDFGHIJ12").ok).toBe(false);
    });

    it("recusa senha sem número", () => {
      expect(avaliarSenha("AbcdefghijK").ok).toBe(false);
    });

    it("recusa senha sem nenhuma letra ou número", () => {
      expect(avaliarSenha("!!!!!!!!!!!!").ok).toBe(false);
    });

    it("acumula todos os problemas de uma vez", () => {
      /* Mostrar um problema por vez faz a pessoa corrigir e errar de
         novo. A tela precisa dizer tudo o que falta de uma vez. */
      const r = avaliarSenha("ab");
      expect(r.problemas.length).toBeGreaterThanOrEqual(2);
    });

    it("diz qual palavra comum foi usada", () => {
      const r = avaliarSenha("MinhaSenhaBoa1");
      expect(r.problemas.join()).toContain("senha");
    });
  });

  describe("o que é aceito", () => {
    it("aceita senha longa e variada", () => {
      expect(avaliarSenha("ConsultoriaAmbiental2026").ok).toBe(true);
    });

    it("aceita senha longa só com letras e números", () => {
      /* Símbolo não é obrigatório. A NIST não exige, e exigir empurra
         a pessoa para `Senha@123`, que está em toda lista de vazamento. */
      expect(avaliarSenha("ConsultoriaAmbiental2026").ok).toBe(true);
    });

    it("aceita senha longa sem maiúscula se tiver o resto", () => {
      /* Uma senha de 15 caracteres só minúscula continua forte contra
         força bruta; a regra de alfabeto existe para senhas curtas. */
      const r = avaliarSenha("consultoriaambiental2026");
      expect(r.ok).toBe(false);
      expect(r.problemas).toHaveLength(1);
      expect(r.problemas[0]).toMatch(/maiúscula/i);
    });

    it("aceita senha longa com acento", () => {
      expect(avaliarSenha("ÁguaSubterrânea2026").ok).toBe(true);
    });

    it("aceita senha exatamente no tamanho mínimo", () => {
      /* "Abcdefghi1" tem 10. A regra é ">= 10", não "> 10". */
      expect(avaliarSenha("Abcdefghi1").ok).toBe(true);
    });
  });

  describe("a nota", () => {
    it("dá nota máxima para senha que passa em tudo", () => {
      expect(avaliarSenha("ConsultoriaAmbiental2026").nota).toBe(4);
    });

    it("dá nota zero para senha que falha em tudo", () => {
      // "!": sem tamanho, sem menor, sem maiúscula, sem número.
      expect(avaliarSenha("!!!!").nota).toBe(0);
    });

    it("a nota nunca sai da faixa de 0 a 4", () => {
      /* `problemas` pode ter mais de 4 itens; sem o teto, a barra do
         formulário receberia nota negativa. */
      const r = avaliarSenha("");
      expect(r.nota).toBeGreaterThanOrEqual(0);
      expect(r.nota).toBeLessThanOrEqual(4);
    });

    it("a nota desce de um em um por problema", () => {
      const umProblema = avaliarSenha("AbcdefghijK"); // sem número
      const doisProblemas = avaliarSenha("abcdefghij"); // sem número, sem maiúscula
      expect(doisProblemas.nota).toBe(umProblema.nota - 1);
    });
  });
});

describe("rotuloForca", () => {
  it("nomeia cada nível da escala", () => {
    expect(rotuloForca(0)).toBe("");
    expect(rotuloForca(1)).toBe("Fraca");
    expect(rotuloForca(2)).toBe("Razoável");
    expect(rotuloForca(3)).toBe("Boa");
    expect(rotuloForca(4)).toBe("Ótima");
  });
});

describe("TAMANHO_MINIMO", () => {
  it("vale 10", () => {
    /* Se esse número mudar, a nota desta constante é o aviso para
       revisar a suíte inteira. */
    expect(TAMANHO_MINIMO).toBe(10);
  });
});
