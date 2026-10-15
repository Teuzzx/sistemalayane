import { DocFolha } from "@/components/DocFolha";
import { ROTULOS_SITUACAO, indicePorBloco, resumir } from "@/lib/conformidade";
import type { ModeloConformidade, Resposta } from "@/db/schema";
import { dataPorExtenso } from "@/lib/dates";

/**
 * Relatório de conformidade impresso — o produto que vai para o cliente.
 *
 * Não é um dump do questionário: é um documento de diagnóstico. Traz o
 * índice, a leitura por bloco, os itens em aberto com a exigência legal
 * ao lado, e o parecer. É papel que a Layane entrega com o pé atrás.
 */
export function DocConformidade({
  modelo,
  respostas,
  cliente,
  titulo,
  indice,
  parecer,
  recomendacoes,
  emitidoEm,
}: {
  modelo: ModeloConformidade;
  respostas: Record<string, Resposta>;
  cliente: { nome: string; cnpj: string | null; cidade: string | null; uf: string | null };
  titulo: string;
  indice: number | null;
  parecer: string | null;
  recomendacoes: string | null;
  emitidoEm: string | null;
}) {
  const resumo = resumir(modelo, respostas);
  const blocos = indicePorBloco(modelo, respostas);
  const parecerFinal = parecer ?? "";

  const rotuloSituacao = (r?: string) => ROTULOS_SITUACAO[r ?? "nao_avaliado"] ?? "—";
  const ehCritico = (r?: string) => r === "nao";

  return (
    <DocFolha
      tipo="Relatório Técnico"
      titulo={titulo}
      subtitulo={modelo.subtitulo}
      voltar="/conformidade"
      rodape={
        <>
          <p>
            Layane Marques — Gestão Ambiental Aplicada · {modelo.assinatura?.nome}
            {modelo.assinatura?.cargo ? `, ${modelo.assinatura.cargo}` : ""}
          </p>
          {emitidoEm && (
            <p className="mt-1">Emitido em {dataPorExtenso(emitidoEm)}.</p>
          )}
          <p className="mt-1">
            Documento técnico de diagnóstico. Não substitui a análise jurídica e não
            isenta a organização das obrigações legais aplicáveis à sua operação.
          </p>
        </>
      }
    >
      {/* --- Identificação --- */}
      <section className="mb-8">
        <p className="label mb-2">Organização avaliada</p>
        <p className="text-[1rem] font-500">{cliente.nome}</p>
        {cliente.cnpj && <p className="text-[0.875rem] text-muted">CNPJ {cliente.cnpj}</p>}
        {(cliente.cidade || cliente.uf) && (
          <p className="text-[0.875rem] text-muted">
            {[cliente.cidade, cliente.uf].filter(Boolean).join("/")}
          </p>
        )}
      </section>

      {modelo.introducao && (
        <section className="mb-8">
          <p className="text-[0.9375rem] leading-relaxed text-muted">
            {modelo.introducao}
          </p>
        </section>
      )}

      {/* --- Índice --- */}
      <section className="mb-9">
        <div className="flex items-baseline gap-4 border-y-2 border-ink py-4">
          <div>
            <p className="label">Índice de conformidade</p>
            <p className="mt-1 text-[2.25rem] leading-none font-500 tnum">
              {indice ?? resumo.indiceGeral}%
            </p>
          </div>
          <div className="ml-auto text-right text-[0.8125rem] text-muted">
            <p>
              {resumo.avaliadas} requisitos avaliados · {resumo.conforme} conformes ·{" "}
              {resumo.parcial} parciais · {resumo.naoConforme} não conformes
            </p>
          </div>
        </div>

        {/* Leitura por bloco */}
        <ul className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1.5">
          {blocos.map((b) => (
            <li key={b.bloco} className="flex items-center gap-2.5 text-[0.8125rem]">
              <span className="min-w-0 flex-1 truncate">{b.bloco}</span>
              <span className="h-1 w-16 shrink-0 bg-line">
                <span
                  className="block h-full bg-ink"
                  style={{ width: `${b.indice ?? 0}%` }}
                />
              </span>
              <span className="w-9 shrink-0 text-right tnum">
                {b.indice === null ? "—" : `${b.indice}%`}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* --- Itens em aberto --- */}
      {resumo.pendentes.length > 0 && (
        <section className="doc-quebra mb-9">
          <p className="label mb-3">Pontos que exigem providência</p>
          <ol>
            {resumo.pendentes.map((p, i) => (
              <li key={i} className="mb-4 border-l-2 border-ink pl-4">
                <p className="text-[0.9375rem] leading-snug">
                  <span className="mr-2 tnum text-faint">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {p.pergunta}
                </p>
                <p className="mt-1 text-[0.8125rem] text-muted">
                  <strong className="font-600">
                    {ehCritico(p.resposta) ? "Não conforme" : rotuloSituacao(p.resposta)}
                  </strong>
                  {p.referencia && <> · {p.referencia}</>}
                  {p.criticidade === "alta" && <> · criticidade alta</>}
                </p>
                {(p.observacao || p.evidencia) && (
                  <p className="mt-1 text-[0.8125rem] text-muted">
                    {p.observacao}
                    {p.observacao && p.evidencia && " — "}
                    {p.evidencia && `Evidência: ${p.evidencia}`}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* --- Itens conformes (resumo) --- */}
      {resumo.conforme > 0 && (
        <section className="mb-9">
          <p className="label mb-3">
            Itens conformes ({resumo.conforme})
          </p>
          <ul className="flex flex-col gap-1">
            {modelo.perguntas
              .filter((p) => respostas[p.id]?.resposta === "sim")
              .map((p) => (
                <li key={p.id} className="text-[0.875rem] leading-relaxed">
                  <span className="mr-2 text-ok">—</span>
                  {p.pergunta}
                  {p.referencia && (
                    <span className="ml-2 text-[0.75rem] text-muted">{p.referencia}</span>
                  )}
                </li>
              ))}
          </ul>
        </section>
      )}

      {/* --- Parecer --- */}
      {parecerFinal && (
        <section className="doc-quebra">
          <p className="label mb-3">Parecer técnico</p>
          <div className="whitespace-pre-line text-[0.9375rem] leading-relaxed">
            {parecerFinal}
          </div>
        </section>
      )}

      {/* --- Recomendações --- */}
      {recomendacoes && (
        <section className="mt-9">
          <p className="label mb-3">Recomendação de providências</p>
          <ol className="flex flex-col gap-2">
            {recomendacoes.split("\n").filter(Boolean).map((r, i) => (
              <li key={i} className="flex gap-3 text-[0.9375rem] leading-relaxed">
                <span className="tnum text-faint">{String(i + 1).padStart(2, "0")}</span>
                <span>{r.replace(/^Prioridade alta — /, "")}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="mt-12 grid grid-cols-2 gap-10 text-[0.8125rem]">
        <div>
          <div className="h-14 border-b border-ink" />
          <p className="mt-2 font-500">{modelo.assinatura?.nome ?? "Layane Marques"}</p>
          <p className="text-muted">{modelo.assinatura?.cargo ?? "Gestora Ambiental"}</p>
          <p className="text-muted">{modelo.assinatura?.registro ?? "Gestão Ambiental Aplicada"}</p>
        </div>
        <div>
          <p className="text-muted">Local e data</p>
          <div className="mt-10 border-b border-ink" />
        </div>
      </section>
    </DocFolha>
  );
}