/**
 * Motor do Relatório de Conformidade.
 *
 * É aqui que o sistema deixa de ser formulário e vira produto: a Layane
 * responde as perguntas, e o relatório sai com índice, classificação por
 * bloco, itens críticos em aberto e o texto do parecer pronto para
 * virar PDF.
 */

import {
  pesoResposta,
  type ModeloConformidade,
  type Pergunta,
  type Resposta,
} from "@/db/schema";
import { dataExtensoLonga } from "@/lib/dates";

export type ResumoResposta = {
  /** `conforme` | `parcial` | `nao_conforme` | `nao_aplicavel` | `nao_avaliado` */
  situacao: string;
  indice: number;
  /** Perguntas que pedem ação, separadas por gravidade. */
  criticas: ItemAcao[];
  /** Perguntas que pedem ação, qualquer gravidade. */
  pendentes: ItemAcao[];
  avaliadas: number;
  conforme: number;
  parcial: number;
  naoConforme: number;
  /** 0–100. Índice geral. */
  indiceGeral: number;
  /** Uma frase que abre o parecer. */
  situacaoGeral: "alto" | "medio" | "baixo";
};

export type ItemAcao = {
  pergunta: string;
  resposta: string;
  criticidade: Pergunta["criticidade"];
  referencia?: string;
  evidencia?: string;
  observacao?: string;
};

const ROTULO_SITUACAO: Record<string, string> = {
  sim: "conforme",
  parcial: "parcial",
  nao: "nao_conforme",
  nao_aplicavel: "nao_aplicavel",
  nao_avaliado: "nao_avaliado",
};

/**
 * Calcula o índice.
 *
 * Regras que decidem o número:
 * - `nao_aplicavel` e `nao_avaliado` ficam FORA da média — não contam
 *   nem a favor nem contra. Sem isso, um cliente com 5 itens não
 *   aplicáveis seria penalizado duas vezes.
 * - `parcial` conta meio.
 * - As perguntas marcadas como `exigeAcao` e respondidas `nao` entram
 *   na lista de pendências independentemente da média.
 */
export function resumir(
  modelo: ModeloConformidade,
  respostas: Record<string, Resposta>,
): ResumoResposta {
  let somaPesos = 0;
  let conta = 0;
  let conforme = 0;
  let parcial = 0;
  let naoConforme = 0;

  const criticas: ItemAcao[] = [];
  const pendentes: ItemAcao[] = [];

  for (const p of modelo.perguntas) {
    const r = respostas[p.id];
    const peso = pesoResposta[r?.resposta ?? "nao_avaliado"] ?? null;

    if (peso === null) continue;

    somaPesos += peso;
    conta += 1;

    const situacao = ROTULO_SITUACAO[r?.resposta ?? "nao_avaliado"];

    if (situacao === "conforme") conforme += 1;
    if (situacao === "parcial") parcial += 1;
    if (situacao === "nao_conforme") naoConforme += 1;

    if (p.exigeAcao && situacao !== "conforme" && situacao !== "nao_aplicavel") {
      const item: ItemAcao = {
        pergunta: p.pergunta,
        resposta: situacao,
        criticidade: p.criticidade,
        referencia: p.referencia,
        evidencia: r?.evidencia,
        observacao: r?.observacao,
      };
      pendentes.push(item);
      if (p.criticidade === "alta") criticas.push(item);
    }
  }

  const indice = conta ? somaPesos / conta : 0;
  const indiceGeral = Math.round(indice * 100);

  const situacaoGeral: ResumoResposta["situacaoGeral"] =
    criticas.length > 0 || indiceGeral < 50
      ? "alto"
      : pendentes.length > 0 || indiceGeral < 80
        ? "medio"
        : "baixo";

  return {
    situacao: situacaoGeral,
    indice: indiceGeral,
    criticas,
    pendentes,
    avaliadas: conta,
    conforme,
    parcial,
    naoConforme,
    indiceGeral,
    situacaoGeral,
  };
}

/** Agrupa as perguntas por bloco, na ordem em que aparecem no modelo. */
export function agruparPorBloco(modelo: ModeloConformidade) {
  const ordem: string[] = [];
  const mapa = new Map<string, Pergunta[]>();

  for (const p of modelo.perguntas) {
    const bloco = p.bloco ?? "Outros itens";
    if (!mapa.has(bloco)) {
      mapa.set(bloco, []);
      ordem.push(bloco);
    }
    mapa.get(bloco)!.push(p);
  }

  return ordem.map((bloco) => ({ bloco, perguntas: mapa.get(bloco)! }));
}

/** Índice de cada bloco — mostra onde a dor está concentrada. */
export function indicePorBloco(
  modelo: ModeloConformidade,
  respostas: Record<string, Resposta>,
) {
  return agruparPorBloco(modelo).map(({ bloco, perguntas }) => {
    let soma = 0;
    let conta = 0;
    let naoConforme = 0;

    for (const p of perguntas) {
      const r = respostas[p.id];
      const peso = pesoResposta[r?.resposta ?? "nao_avaliado"] ?? null;
      if (peso === null) continue;
      soma += peso;
      conta += 1;
      if (r?.resposta === "nao") naoConforme += 1;
    }

    return {
      bloco,
      indice: conta ? Math.round((soma / conta) * 100) : null,
      avaliadas: conta,
      naoConforme,
    };
  });
}

/**
 * Texto do parecer.
 *
 * Não substitui a visão da Layane — ela edita antes de emitir. Mas já
 * vem com a estrutura argumentativa pronta: o que foi avaliado, onde
 * está o risco e o que precisa acontecer. É esse texto que sai impresso.
 */
export function redigirParecer(opts: {
  cliente: string;
  modelo: ModeloConformidade;
  resumo: ResumoResposta;
  hoje: string;
  autor?: string;
}): string {
  const { cliente, modelo, resumo, hoje: dia } = opts;

  const abertura: Record<ResumoResposta["situacaoGeral"], string> = {
    alto:
      "O diagnóstico identificou lacunas relevantes na gestão ambiental da organização, " +
      "com pontos que exigem providência para eliminar o risco de não conformidade.",
    medio:
      "O diagnóstico identificou pendências que precisam de atenção. A organização " +
      "demonstra parte considerável da conformidade requerida, com ajustes pontuais a fazer.",
    baixo:
      "O diagnóstico identificou a gestão ambiental da organização como adequada às " +
      "exigências avaliadas, com poucas providências de manutenção e melhoria.",
  };

  const paragrafos: string[] = [];

  paragrafos.push(
    `${abertura[resumo.situacaoGeral]} foram avaliados ${resumo.avaliadas} requisitos, ` +
      `dos quais ${resumo.conforme} estão conformes, ${resumo.parcial} parcialmente ` +
      `conformes e ${resumo.naoConforme} não conformes. O índice de conformidade ` +
      `resultante foi de ${resumo.indiceGeral}%.`,
  );

  if (resumo.criticas.length > 0) {
    paragrafos.push(
      `Os itens de criticidade alta a seguir demandam providência imediata, por ` +
        `revelarem exposição direta a risco ambiental e/ou jurídico:`,
    );
    for (const c of resumo.criticas) {
      paragrafos.push(
        `— ${c.pergunta}${c.referencia ? ` (${c.referencia})` : ""}` +
          (c.observacao ? `. Situação observada: ${c.observacao}` : "."),
      );
    }
  } else if (resumo.pendentes.length > 0) {
    paragrafos.push(
      "Não foram identificados itens de criticidade alta, mas permanecem pendências " +
        "que devem ser tratadas no curto prazo:",
    );
    for (const c of resumo.pendentes) {
      paragrafos.push(
        `— ${c.pergunta}${c.referencia ? ` (${c.referencia})` : ""}` +
          (c.observacao ? `. Situação observada: ${c.observacao}` : "."),
      );
    }
  } else {
    paragrafos.push(
      "Nenhuma pendência que exija ação imediata foi identificada na amostra avaliada.",
    );
  }

  paragrafos.push(
    `O presente documento reflete a situação verificada em ${dataExtensoLonga(dia)} e ` +
      `constitui um diagnóstico técnico. Passa a ser omisso se as condições da ` +
      `organização mudarem de forma relevante. A organização deve comunicar à gestão ` +
      `ambiental qualquer alteração na operação, no local ou na regulamentação aplicável.`,
  );

  return paragrafos.join("\n\n");
}

/** Sugestões de ação a partir dos itens pendentes — vira a lista `recomendacoes`. */
export function sugerirRecomendacoes(resumo: ResumoResposta): string[] {
  const recomendacoes = new Map<string, string>();

  for (const item of resumo.pendentes) {
    const chave = item.pergunta.slice(0, 40);
    if (recomendacoes.has(chave)) continue;
    recomendacoes.set(
      chave,
      item.criticidade === "alta"
        ? `Prioridade alta — ${lowerFirst(item.pergunta)}${item.referencia ? ` (${item.referencia})` : ""}`
        : `${lowerFirst(item.pergunta)}${item.referencia ? ` (${item.referencia})` : ""}`,
    );
  }

  return [...recomendacoes.values()];
}

function lowerFirst(texto: string): string {
  if (!texto) return texto;
  return texto.charAt(0).toLowerCase() + texto.slice(1);
}

/** Texto que sugere o valor total formatado para o relatório. */
export const ROTULOS_SITUACAO = ROTULO_SITUACAO;