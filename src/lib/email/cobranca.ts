/**
 * Regra de quem recebe cobrança, e com que tom.
 *
 * Módulo puro de propósito — recebe a lista, devolve a decisão. Não sabe
 * o que é banco, e-mail ou React. Isso é o que permite testar as
 * decisões que importam (mandar para quem? em que prazo? com que
 * urgência?) sem subir servidor nem mockar provedor.
 *
 * Os limites ficam em constantes nomeadas porque são número mágico que
 * a Layane vai querer ajustar depois — e porque número mágico escrito
 * no meio de uma comparação ninguém consegue defender numa reunião.
 */

export type UrgenciaCobranca = "vencimento" | "urgente" | "atraso";

export type LinhaCobranca = {
  lancamentoId: string;
  descricao: string;
  /** Centavos. `null` quando o valor não foi preenchido. */
  valorCentavos: number | null;
  /** `YYYY-MM-DD`. Vazio significa "sem data" e é excluído. */
  vencimento: string;
  status: "pendente" | "pago" | "atrasado" | "cancelado";
  /** Último aviso enviado, `YYYY-MM-DD` ou null. */
  ultimaCobrancaEm: string | null;

  clienteId?: string | null;
  clienteNome?: string | null;
  emailCliente?: string | null;
  /** Nome já sem o primeiro sobrenome, para o assunto ficar natural. */
  primeiroNome?: string | null;
};

export type ItemIncluido = LinhaCobranca & {
  urgencia: UrgenciaCobranca;
  /** Negativo = quantos dias de atraso. */
  diasParaVencimento: number;
};

export type ItemExcluido = LinhaCobranca & { motivo: string };

export type PlanoCobranca = {
  incluidos: ItemIncluido[];
  excluidos: ItemExcluido[];
  totalCentavos: number;
};

/* ------------------------------------------------------------------ */
/* Limites                                                             */
/* ------------------------------------------------------------------ */

/** Quantos dias antes do vencimento o aviso já entra no lote. */
export const JANELA_DE_ANTECEDENCIA = 10;

/** Depois de quantos dias sem resposta o mesmo lançamento avisa de novo. */
export const INTERVALO_MINIMO_DIAS = 7;

/** A partir de quantos dias de prazo o texto passa a ser "urgente". */
export const LIMITE_DE_URGENCIA = 3;

/* ------------------------------------------------------------------ */
/* Datas                                                               */
/* ------------------------------------------------------------------ */

const DIA_MS = 86_400_000;

/**
 * Diferença em dias inteiros entre duas datas `YYYY-MM-DD`.
 *
 * Converte por `Date.UTC` de propósito. `new Date("2026-03-01")` em
 * JavaScript é meia-noite *local*, e num fuso como o de São Paulo (UTC-3)
 * isso vira 03/03 21:00 UTC — o que jogaria o cálculo de dias meio dia
 * fora e faria um boleto vencer "ontem".
 */
export function diasEntre(deISO_: string, ateISO: string): number | null {
  const a = Date.parse(`${deISO_}T00:00:00Z`);
  const b = Date.parse(`${ateISO}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / DIA_MS);
}

/**
 * Checagem de e-mail.
 *
 * Deliberadamente simplista: um regex que aceita o que o navegador e o
 * servidor de e-mail aceitam na prática. Validar RFC 5322 inteiro aqui
 * só rejeitaria endereço válido e deixaria passar lixo.
 */
export function emailValido(email: string | null | undefined): boolean {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

/* ------------------------------------------------------------------ */
/* A regra                                                             */
/* ------------------------------------------------------------------ */

export function planoDeCobranca(
  linhas: LinhaCobranca[],
  hojeISO: string,
): PlanoCobranca {
  const incluidos: ItemIncluido[] = [];
  const excluidos: ItemExcluido[] = [];

  for (const linha of linhas) {
    const fora = (motivo: string) => excluidos.push({ ...linha, motivo });

    if (linha.status === "pago") {
      fora("Já está pago.");
      continue;
    }
    if (linha.status === "cancelado") {
      fora("Lançamento cancelado.");
      continue;
    }
    if (!emailValido(linha.emailCliente)) {
      fora("Cliente sem e-mail válido cadastrado.");
      continue;
    }
    if (!linha.vencimento) {
      fora("Sem data de vencimento — não dá para avisar.");
      continue;
    }

    const dias = diasEntre(hojeISO, linha.vencimento);
    if (dias === null) {
      fora("Data de vencimento inválida.");
      continue;
    }

    const atrasado = dias < 0;

    /* Só entra na janela se ainda vier, ou se já estiver atrasado. */
    if (!atrasado && dias > JANELA_DE_ANTECEDENCIA) {
      fora(`Vence em ${dias} dias — ainda fora da janela de aviso.`);
      continue;
    }

    /*
     * O intervalo mínimo segura o cliente de três e-mails na semana.
     * Para o que já está atrasado ele NÃO vale: um boleto 10 dias
     * vencido que recebeu aviso semana passada continua precisando de
     * lembrete, e é justamente esse o caso que dói no caixa.
     */
    if (!atrasado && linha.ultimaCobrancaEm) {
      const desde = diasEntre(linha.ultimaCobrancaEm, hojeISO);
      if (desde !== null && desde < INTERVALO_MINIMO_DIAS) {
        fora(`Já recebeu aviso há ${desde} dia(s).`);
        continue;
      }
    }

    const urgencia: UrgenciaCobranca = atrasado
      ? "atraso"
      : dias <= LIMITE_DE_URGENCIA
        ? "urgente"
        : "vencimento";

    incluidos.push({ ...linha, urgencia, diasParaVencimento: dias });
  }

  return {
    incluidos,
    excluidos,
    totalCentavos: incluidos.reduce(
      (soma, l) => soma + (l.valorCentavos ?? 0),
      0,
    ),
  };
}
