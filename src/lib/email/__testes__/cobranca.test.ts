/**
 * Regra de quem recebe cobrança.
 *
 * Este é o teste que mais importa do sistema, porque um erro aqui não
 * aparece como tela quebrada: aparece como e-mail indevido na caixa de
 * um cliente real. Por isso os casos são nomeados pela decisão que
 *ocolhem, não pela função que exercitam.
 *
 * Todos os dados são explícitos no teste — nada de mock, nada de banco.
 * A função recebe a lista e devolve a lista; se um dia ela consultar o
 * banco sozinha, este arquivo quebra e avisa.
 */

import { describe, expect, it } from "vitest";

import { planoDeCobranca, type LinhaCobranca } from "@/lib/email/cobranca";

const base: LinhaCobranca = {
  lancamentoId: "lan_1",
  descricao: "Consultoria — laudo",
  valorCentavos: 250_000,
  vencimento: "2026-03-10",
  status: "pendente",
  /** Já recebeu aviso nos últimos dias? Evita bombardear o cliente. */
  ultimaCobrancaEm: null,
  clienteNome: "Ana Ribeiro",
  emailCliente: "ana@exemplo.com.br",
  primeiroNome: "Ana",
};

/** Monta uma lista a partir de uma lista de sobrescritas parciais. */
const linhas = (...parciais: Partial<LinhaCobranca>[]): LinhaCobranca[] =>
  parciais.map((p, i) => ({ ...base, ...p, lancamentoId: `lan_${i + 1}` }));

const HOJE = "2026-03-01";

describe("planoDeCobranca", () => {
  describe("quem entra no lote", () => {
    it("inclui o que vence hoje", () => {
      const plano = planoDeCobranca(linhas({ vencimento: HOJE }), HOJE);
      expect(plano.incluidos.map((l) => l.lancamentoId)).toEqual(["lan_1"]);
    });

    it("inclui o que vence nos próximos dias", () => {
      const plano = planoDeCobranca(
        linhas({ vencimento: "2026-03-08" }),
        HOJE,
      );
      expect(plano.incluidos).toHaveLength(1);
    });

    it("inclui o que já está atrasado", () => {
      const plano = planoDeCobranca(
        linhas({ vencimento: "2026-02-20", status: "atrasado" }),
        HOJE,
      );
      expect(plano.incluidos).toHaveLength(1);
    });

    it("exclui o que vence depois da janela", () => {
      const plano = planoDeCobranca(
        linhas({ vencimento: "2026-06-01" }),
        HOJE,
      );
      expect(plano.incluidos).toHaveLength(0);
      expect(plano.excluidos).toHaveLength(1);
    });

    it("exclui o que já foi pago", () => {
      const plano = planoDeCobranca(
        linhas({ status: "pago", vencimento: "2026-03-05" }),
        HOJE,
      );
      expect(plano.incluidos).toHaveLength(0);
    });

    it("exclui o que foi cancelado", () => {
      const plano = planoDeCobranca(
        linhas({ status: "cancelado", vencimento: "2026-03-05" }),
        HOJE,
      );
      expect(plano.incluidos).toHaveLength(0);
    });

    it("exclui quem não tem e-mail cadastrado", () => {
      const plano = planoDeCobranca(
        linhas({ vencimento: "2026-03-05", emailCliente: "" }),
        HOJE,
      );
      expect(plano.incluidos).toHaveLength(0);
      expect(plano.excluidos[0]?.motivo).toMatch(/e-mail/i);
    });

    it("exclui e-mail malformado em vez de mandar para o vazio", () => {
      const plano = planoDeCobranca(
        linhas({ vencimento: "2026-03-05", emailCliente: "nao-e-email" }),
        HOJE,
      );
      expect(plano.incluidos).toHaveLength(0);
      expect(plano.excluidos[0]?.motivo).toMatch(/e-mail/i);
    });
  });

  describe("quando já avisou antes", () => {
    it("não repete o aviso dentro do intervalo mínimo", () => {
      const plano = planoDeCobranca(
        linhas({ vencimento: "2026-03-05", ultimaCobrancaEm: "2026-02-27" }),
        HOJE,
      );
      expect(plano.incluidos).toHaveLength(0);
      expect(plano.excluidos[0]?.motivo).toMatch(/já recebeu/i);
    });

    it("reenvia quando o intervalo mínimo já passou", () => {
      const plano = planoDeCobranca(
        linhas({ vencimento: "2026-03-05", ultimaCobrancaEm: "2026-01-10" }),
        HOJE,
      );
      expect(plano.incluidos).toHaveLength(1);
    });

    it("considera atrasado como autorização para reavisar", () => {
      /* Um cliente 10 dias atrasado que recebeu e-mail semana passada
         continua precisando de lembrete. O intervalo mínimo vale para o
         que ainda vai vencer, não para o que já passou. */
      const plano = planoDeCobranca(
        linhas({
          vencimento: "2026-02-19",
          status: "atrasado",
          ultimaCobrancaEm: "2026-02-27",
        }),
        HOJE,
      );
      expect(plano.incluidos).toHaveLength(1);
    });
  });

  describe("o que a mensagem diz", () => {
    it("escolhe o tom de atraso quando a data já passou", () => {
      const plano = planoDeCobranca(
        linhas({ vencimento: "2026-02-20", status: "atrasado" }),
        HOJE,
      );
      expect(plano.incluidos[0]?.urgencia).toBe("atraso");
    });

    it("escolhe o tom de vencimento quando a data ainda vem", () => {
      const plano = planoDeCobranca(
        linhas({ vencimento: "2026-03-05", status: "pendente" }),
        HOJE,
      );
      expect(plano.incluidos[0]?.urgencia).toBe("vencimento");
    });

    it("marca como urgente o que vence em até três dias", () => {
      const plano = planoDeCobranca(
        linhas({ vencimento: "2026-03-03", status: "pendente" }),
        HOJE,
      );
      expect(plano.incluidos[0]?.urgencia).toBe("urgente");
    });

    it("sabe quantos dias faltam, para o texto citar o prazo certo", () => {
      const plano = planoDeCobranca(
        linhas({ vencimento: "2026-03-08", status: "pendente" }),
        HOJE,
      );
      expect(plano.incluidos[0]?.diasParaVencimento).toBe(7);
    });

    it("conta dias negativos para o que está atrasado", () => {
      const plano = planoDeCobranca(
        linhas({ vencimento: "2026-02-26", status: "atrasado" }),
        HOJE,
      );
      expect(plano.incluidos[0]?.diasParaVencimento).toBe(-3);
    });
  });

  describe("quando a lista vem suja", () => {
    it("não trava com lista vazia", () => {
      const plano = planoDeCobranca([], HOJE);
      expect(plano.incluidos).toHaveLength(0);
      expect(plano.totalCentavos).toBe(0);
    });

    it("ignora lançamento sem data de vencimento", () => {
      const plano = planoDeCobranca(
        linhas({ vencimento: "" }),
        HOJE,
      );
      expect(plano.incluidos).toHaveLength(0);
      expect(plano.excluidos[0]?.motivo).toMatch(/vencimento/i);
    });

    it("soma o valor de tudo que entra, em centavos", () => {
      const plano = planoDeCobranca(
        linhas(
          { vencimento: "2026-03-03", valorCentavos: 100_000 },
          { vencimento: "2026-03-05", valorCentavos: 250_500 },
          { vencimento: "2026-09-01", valorCentavos: 999_999 },
        ),
        HOJE,
      );
      expect(plano.incluidos).toHaveLength(2);
      expect(plano.totalCentavos).toBe(350_500);
    });

    it("trata valor ausente como zero, sem virar NaN", () => {
      const plano = planoDeCobranca(
        linhas({ vencimento: "2026-03-05", valorCentavos: null }),
        HOJE,
      );
      expect(plano.totalCentavos).toBe(0);
      expect(Number.isNaN(plano.totalCentavos)).toBe(false);
    });
  });
});
