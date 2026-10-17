import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirSecao } from "@/lib/exigir";

import { marcarEnviada } from "@/actions/conformidade";
import { Icone } from "@/components/Icone";
import { FormConformidade } from "@/components/forms/FormConformidade";
import { rotulosStatusConformidade } from "@/db/schema";
import { detalheAnalise } from "@/lib/consultas";
import { requireAdmin } from "@/lib/auth";
import { indicePorBloco, resumir } from "@/lib/conformidade";
import { formatarData } from "@/lib/dates";
import {
  CabecalhoPagina,
  Etiqueta,
  EtiquetaStatus,
  Painel,
  Regua,
} from "@/components/ui";

export default async function PaginaAnalise({ params }: { params: Promise<{ id: string }> }) {
  await exigirSecao("conformidade");
  const { id } = await params;
  const dados = await detalheAnalise(id);
  if (!dados) notFound();

  const { analise, nomeCliente } = dados;

  /* O relatório emitido congela o modelo — é esse que o documento mostra. */
  const modelo = analise.modeloAplicado ?? null;
  const emitido = analise.status === "emitido" || analise.status === "enviado";

  const resumo = modelo ? resumir(modelo, analise.respostas ?? {}) : null;
  const blocos = modelo ? indicePorBloco(modelo, analise.respostas ?? {}) : [];

  return (
    <div className="flex flex-col gap-7">
      <CabecalhoPagina
        eyebrow="Conformidade"
        titulo={analise.titulo}
        descricao={nomeCliente}
        acoes={
          <div className="flex flex-wrap items-center gap-2">
            <EtiquetaStatus rotulo={rotulosStatusConformidade[analise.status]} />
            {emitido && (
              <>
                <Link href={`/doc/conformidade/${id}`} className="btn btn-secundario" target="_blank">
                  <Icone nome="imprimir" tamanho={15} />
                  Ver relatório
                </Link>
                <form action={marcarEnviada}>
                  <input type="hidden" name="id" value={id} />
                  <button type="submit" className="btn btn-secundario">
                    <Icone nome="baixar" tamanho={15} />
                    Marcar como enviado
                  </button>
                </form>
              </>
            )}
            <Link href={`/clientes/${analise.clienteId}?aba=resumo`} className="btn btn-secundario">
              <Icone nome="clientes" tamanho={15} />
              Ver cliente
            </Link>
          </div>
        }
      />

      {!modelo && !emitido && (
        <div className="border border-line-strong bg-surface px-5 py-4 text-[0.875rem] text-muted">
          O questionário aplicado não foi encontrado. Abra uma nova análise.
        </div>
      )}

      {/* --- Índice e blocos --- */}
      {emitido && resumo && (
        <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
          <Painel titulo="Resultado">
            <div className="flex flex-col">
              <div className="flex items-baseline gap-3 pb-3">
                <span
                  className={[
                    "text-[2.5rem] leading-none font-500 tnum",
                    resumo.indiceGeral >= 80
                      ? "text-ok"
                      : resumo.indiceGeral >= 50
                        ? "text-warn"
                        : "text-danger",
                  ].join(" ")}
                >
                  {resumo.indiceGeral}%
                </span>
                <Etiqueta
                  tom={
                    resumo.situacaoGeral === "baixo"
                      ? "ok"
                      : resumo.situacaoGeral === "medio"
                        ? "warn"
                        : "danger"
                  }
                >
                  {resumo.situacaoGeral === "baixo"
                    ? "Conformidade alta"
                    : resumo.situacaoGeral === "medio"
                      ? "Conformidade parcial"
                      : "Risco elevado"}
                </Etiqueta>
              </div>

              <div className="border-t border-line pt-3 text-[0.875rem]">
                <div className="linha-dado">
                  <span className="label">Itens avaliados</span>
                  <span className="tnum">{resumo.avaliadas}</span>
                </div>
                <div className="linha-dado">
                  <span className="label">Conformes</span>
                  <span className="tnum text-ok">{resumo.conforme}</span>
                </div>
                <div className="linha-dado">
                  <span className="label">Parciais</span>
                  <span className="tnum text-warn">{resumo.parcial}</span>
                </div>
                <div className="linha-dado">
                  <span className="label">Não conformes</span>
                  <span className="tnum text-danger">{resumo.naoConforme}</span>
                </div>
                <div className="linha-dado">
                  <span className="label">Exigem ação</span>
                  <span className="tnum">{resumo.pendentes.length}</span>
                </div>
              </div>

              {analise.emitidoEm && (
                <p className="mt-4 border-t border-line pt-3 text-[0.8125rem] text-faint">
                  Emitido em {formatarData(analise.emitidoEm)}
                </p>
              )}
            </div>
          </Painel>

          <Painel
            titulo="Índice por bloco"
            descricao="Onde a dor está concentrada."
          >
            <ul>
              {blocos.map((b) => (
                <li
                  key={b.bloco}
                  className="flex items-center gap-3 border-b border-line py-2 last:border-b-0"
                >
                  <span className="min-w-0 flex-1 truncate text-[0.875rem]">{b.bloco}</span>
                  <span className="h-1.5 w-24 shrink-0 bg-surface-2">
                    <span
                      className="block h-full bg-accent"
                      style={{ width: `${b.indice ?? 0}%` }}
                    />
                  </span>
                  <span
                    className={`w-10 shrink-0 text-right text-[0.875rem] font-500 tnum ${
                      (b.indice ?? 100) < 50 ? "text-danger" : (b.indice ?? 100) < 80 ? "text-warn" : "text-ok"
                    }`}
                  >
                    {b.indice === null ? "—" : `${b.indice}%`}
                  </span>
                </li>
              ))}
            </ul>
          </Painel>
        </div>
      )}

      {emitido && analise.parecer && (
        <Painel titulo="Parecer" descricao="Texto que vai no relatório entregue ao cliente.">
          <div className="max-w-[72ch] whitespace-pre-line text-[0.9375rem] leading-relaxed">
            {analise.parecer}
          </div>

          {analise.recomendacoes && (
            <>
              <p className="label mt-6 mb-2">Recomendações</p>
              <ul className="max-w-[72ch] flex flex-col gap-1.5">
                {analise.recomendacoes.split("\n").filter(Boolean).map((r, i) => (
                  <li key={i} className="flex gap-2.5 text-[0.9375rem] leading-relaxed">
                    <span className="index-num shrink-0 pt-1">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>{r.replace(/^Prioridade alta — /, "")}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Painel>
      )}

      {modelo && (
        <>
          <Regua />
          <FormConformidade
            analise={analise}
            modelo={modelo}
            nomeCliente={nomeCliente}
            bloqueado={emitido}
          />
        </>
      )}
    </div>
  );
}
