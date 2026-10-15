"use client";

import { useActionState, useMemo, useState } from "react";

import { emitirAnalise, salvarRespostas, type Estado } from "@/actions/conformidade";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { Icone } from "@/components/Icone";
import { Aviso, Campo, Etiqueta, type Tom } from "@/components/ui";
import {
  rotulosResposta,
  rotulosStatusConformidade,
  type ModeloConformidade,
  type Resposta,
} from "@/db/schema";

const OPCOES: { v: string; r: string; tom: Tom }[] = [
  { v: "sim", r: rotulosResposta.sim, tom: "ok" },
  { v: "parcial", r: rotulosResposta.parcial, tom: "warn" },
  { v: "nao", r: rotulosResposta.nao, tom: "danger" },
  { v: "nao_aplicavel", r: rotulosResposta.nao_aplicavel, tom: "mute" },
  { v: "nao_avaliado", r: rotulosResposta.nao_avaliado, tom: "mute" },
];

/**
 * Questionário de conformidade.
 *
 * A tela é a "entrevista" com o cliente. Cada pergunta traz a exigência
 * legal e, quando marcada como crítica, o sistema avisa que aquele item
 * vai para o parecer. O progresso fica no topo — a Layane sabe quanto
 * falta antes de fechar com o cliente.
 */
export function FormConformidade({
  analise,
  modelo,
  nomeCliente,
  bloqueado,
}: {
  analise: {
    id: string;
    clienteId: string;
    titulo: string;
    status: keyof typeof rotulosStatusConformidade;
    respostas: Record<string, Resposta>;
    parecer: string | null;
  };
  modelo: ModeloConformidade;
  nomeCliente: string;
  bloqueado: boolean;
}) {
  const [estadoSalvar, salvar] = useActionState<Estado, FormData>(salvarRespostas, {});
  const [estadoEmitir, emitir] = useActionState<Estado, FormData>(emitirAnalise, {});
  const [respostas, setRespostas] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      modelo.perguntas.map((p) => [p.id, analise.respostas[p.id]?.resposta ?? "nao_avaliado"]),
    ),
  );
  const [expandidas, setExpandidas] = useState<Record<string, boolean>>({});

  const progresso = useMemo(() => {
    const total = modelo.perguntas.length;
    const feitas = Object.values(respostas).filter(
      (r) => r && r !== "nao_avaliado",
    ).length;
    return { total, feitas, pct: total ? Math.round((feitas / total) * 100) : 0 };
  }, [respostas, modelo]);

  const naoConformes = modelo.perguntas.filter((p) => respostas[p.id] === "nao").length;
  const criticasAbertas = modelo.perguntas.filter(
    (p) => respostas[p.id] === "nao" && p.criticidade === "alta",
  ).length;

  const porBloco = modelo.perguntas.reduce<Record<string, typeof modelo.perguntas>>(
    (acc, p) => {
      const bloco = p.bloco ?? "Outros itens";
      (acc[bloco] ??= []).push(p);
      return acc;
    },
    {},
  );

  const definir = (id: string, valor: string) =>
    setRespostas((r) => ({ ...r, [id]: valor }));

  return (
    <div className="flex flex-col gap-8">
      {/* --- Progresso --- */}
      <div className="border border-line-strong bg-surface px-5 py-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="label">Progresso do diagnóstico</p>
            <p className="mt-1 text-[1.375rem] leading-none font-500 tnum">
              {progresso.feitas}
              <span className="text-faint">/{progresso.total}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {naoConformes > 0 && (
              <Etiqueta tom="danger">{naoConformes} não conforme(s)</Etiqueta>
            )}
            {criticasAbertas > 0 && (
              <Etiqueta tom="danger">{criticasAbertas} crítica(s)</Etiqueta>
            )}
            {progresso.feitas === progresso.total && criticasAbertas === 0 && (
              <Etiqueta tom="ok">Respondido</Etiqueta>
            )}
          </div>
        </div>

        <div className="mt-3 h-1 bg-surface-2">
          <div
            className="h-full bg-accent transition-[width] duration-300"
            style={{ width: `${progresso.pct}%` }}
          />
        </div>
      </div>

      {bloqueado ? (
        <Aviso tipo="info">
          Este relatório já foi emitido. O questionário fica congelado — abra uma nova
          análise se precisar de uma nova versão.
        </Aviso>
      ) : (
        <>
          {estadoSalvar.erro && <Aviso tipo="erro">{estadoSalvar.erro}</Aviso>}
          {estadoSalvar.ok && <Aviso tipo="ok">{estadoSalvar.ok}</Aviso>}
          {estadoEmitir.erro && <Aviso tipo="erro">{estadoEmitir.erro}</Aviso>}
          {estadoEmitir.ok && <Aviso tipo="ok">{estadoEmitir.ok}</Aviso>}

          <form action={salvar} className="flex flex-col gap-9">
            <input type="hidden" name="id" value={analise.id} />

            {Object.entries(porBloco).map(([bloco, perguntas], bi) => (
              <section key={bloco}>
                <header className="flex items-baseline gap-3 border-b border-line-strong pb-2.5">
                  <span className="index-num">{String(bi + 1).padStart(2, "0")}</span>
                  <div>
                    <h2 className="text-[1.0625rem] font-500">{bloco}</h2>
                    <p className="text-[0.8125rem] text-faint">
                      {perguntas.filter((p) => respostas[p.id] !== "nao_avaliado").length}{" "}
                      de {perguntas.length} respondida(s)
                    </p>
                  </div>
                </header>

                <div className="mt-4 flex flex-col gap-3">
                  {perguntas.map((p) => {
                    const atual = respostas[p.id];
                    const respondida = atual !== "nao_avaliado";
                    const aberta = expandidas[p.id] ?? false;

                    return (
                      <div
                        key={p.id}
                        className={[
                          "border px-4 py-3.5 transition-colors duration-150",
                          atual === "nao" && p.criticidade === "alta"
                            ? "border-danger/35 bg-danger-bg"
                            : atual === "nao"
                              ? "border-danger/25 bg-surface"
                              : atual === "parcial"
                                ? "border-warn/30 bg-surface"
                                : respondida
                                  ? "border-ok/25 bg-surface"
                                  : "border-line bg-surface-2",
                        ].join(" ")}
                      >
                        <input type="hidden" name="perguntaId" value={p.id} />
                        <input type="hidden" name={`resposta_${p.id}`} value={atual} />

                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-[0.9375rem] leading-snug font-500">
                              {p.pergunta}
                            </p>

                            {p.ajuda && (
                              <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted">
                                {p.ajuda}
                              </p>
                            )}

                            <div className="mt-1.5 flex flex-wrap items-center gap-2">
                              {p.referencia && (
                                <span className="text-[0.75rem] text-mineral">
                                  {p.referencia}
                                </span>
                              )}
                              {p.criticidade === "alta" && (
                                <Etiqueta tom="danger">Crítico</Etiqueta>
                              )}
                              {p.exigeAcao && (
                                <Etiqueta tom="warn">Exige ação</Etiqueta>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Respostas */}
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {OPCOES.map((o) => {
                            const selecionada = atual === o.v;
                            return (
                              <label
                                key={o.v}
                                className={[
                                  "cursor-pointer rounded-full border px-3 py-1.5 text-[0.75rem] transition-colors duration-150",
                                  selecionada
                                    ? o.tom === "ok"
                                      ? "border-ok bg-ok text-on-deep"
                                      : o.tom === "warn"
                                        ? "border-warn bg-warn text-on-deep"
                                        : o.tom === "danger"
                                          ? "border-danger bg-danger text-on-deep"
                                          : "border-mute bg-mute text-on-deep"
                                    : "border-line-strong text-muted hover:border-accent hover:text-ink",
                                ].join(" ")}
                              >
                                <input
                                  type="radio"
                                  name={`resp_ui_${p.id}`}
                                  className="sr-only"
                                  checked={selecionada}
                                  onChange={() => definir(p.id, o.v)}
                                />
                                {o.r}
                              </label>
                            );
                          })}
                        </div>

                        {/* Evidência e observação */}
                        <button
                          type="button"
                          onClick={() =>
                            setExpandidas((e) => ({ ...e, [p.id]: !aberta }))
                          }
                          className="mt-2 text-[0.75rem] text-accent hover:underline"
                        >
                          {aberta ? "− fechar evidência" : "+ evidência / observação"}
                        </button>

                        {aberta && (
                          <div className="mt-2 grid gap-3 sm:grid-cols-2">
                            <Campo rotulo="Evidência" htmlFor={`evidencia_${p.id}`}>
                              <input
                                id={`evidencia_${p.id}`}
                                name={`evidencia_${p.id}`}
                                defaultValue={analise.respostas[p.id]?.evidencia ?? ""}
                                className="field"
                                placeholder="Nº do documento, foto, laudo"
                              />
                            </Campo>
                            <Campo rotulo="Observação" htmlFor={`observacao_${p.id}`}>
                              <input
                                id={`observacao_${p.id}`}
                                name={`observacao_${p.id}`}
                                defaultValue={analise.respostas[p.id]?.observacao ?? ""}
                                className="field"
                                placeholder="O que foi encontrado"
                              />
                            </Campo>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}

            <div className="border-t border-line pt-5">
              <BotaoEnviar variante="secundario">
                Salvar respostas
                <Icone nome="seta" tamanho={16} className="seta" />
              </BotaoEnviar>
            </div>
          </form>

          {/* --- Emissão --- */}
          <section className="border border-line-strong bg-surface px-5 py-5">
            <p className="label">Emitir parecer</p>
            <p className="mt-1.5 max-w-[68ch] text-[0.875rem] leading-relaxed text-muted">
              O sistema calcula o índice de conformidade a partir das respostas, escreve
              o parecer e congela o questionário aplicado. Você pode revisar e ajustar o
              texto antes de salvar.
            </p>

            <form action={emitir} className="mt-4 flex flex-col gap-4">
              <input type="hidden" name="id" value={analise.id} />

              <Campo
                rotulo="Parecer (deixe vazio para o sistema redigir)"
                htmlFor="parecer"
                dica="Texto que vai impresso no relatório, voltado ao cliente."
              >
                <textarea
                  id="parecer"
                  name="parecer"
                  rows={8}
                  defaultValue={analise.parecer ?? ""}
                  className="field"
                  placeholder="O sistema escreve sozinho a partir das respostas — você edita o que quiser."
                />
              </Campo>

              <Campo
                rotulo="Recomendações"
                htmlFor="recomendacoes"
                dica="Uma por linha. Vazio = sugeridas pelo sistema."
              >
                <textarea
                  id="recomendacoes"
                  name="recomendacoes"
                  rows={5}
                  className="field"
                />
              </Campo>

              <BotaoEnviar variante="primario">
                Emitir relatório de {nomeCliente}
                <Icone nome="seta" tamanho={16} className="seta" />
              </BotaoEnviar>
            </form>
          </section>
        </>
      )}
    </div>
  );
}