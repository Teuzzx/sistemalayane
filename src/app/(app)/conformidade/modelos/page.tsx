import { desc } from "drizzle-orm";
import { exigirSecao } from "@/lib/exigir";

import { alternarModelo, duplicarModelo, obterModelo } from "@/actions/conformidade";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/db";
import { modelosConformidade } from "@/db/schema";
import { Etiqueta, Painel, Vazio } from "@/components/ui";

export const metadata = { title: "Questionários de conformidade" };

/**
 * Editor de questionário.
 *
 * O roteiro padrão cobre o caminho geral. Quem atende um setor específico
 * (município, construção civil, indústria) copia e ajusta — em vez de
 * responder item que não se aplica, o relatório fica limpo.
 */
export default async function PaginaModelos({
  searchParams,
}: {
  searchParams: Promise<{ editar?: string }>;
}) {
  await exigirSecao("conformidade");
  const { editar } = await searchParams;

  const modelos = await db
    .select()
    .from(modelosConformidade)
    .orderBy(desc(modelosConformidade.ativo), modelosConformidade.nome);

  const emEdicao = editar ? await obterModelo(editar) : null;

  return (
    <div className="flex flex-col gap-7">
      <header className="border-b border-line pb-5">
        <p className="label">Configuração do diagnóstico</p>
        <h1 className="mt-1.5 text-[1.6rem] leading-tight font-500 tracking-[-0.008em]">
          Questionários de conformidade
        </h1>
        <p className="mt-1.5 max-w-[68ch] text-[0.9375rem] text-muted">
          Cada questionário é uma versão do relatório. O roteiro padrão cobre o caminho
          geral; para um setor específico, copie e ajuste — o relatório emitido guarda
          a versão que foi respondida, então editar depois não muda documento já entregue.
        </p>
      </header>

      {emEdicao && (
        <Painel
          titulo={emEdicao.nome}
          descricao={`${emEdicao.modelo.perguntas.length} pergunta(s) · versão ${emEdicao.versao}`}
        >
          <ol>
            {emEdicao.modelo.perguntas.map((p, i) => (
              <li key={p.id} className="border-b border-line py-3 last:border-b-0">
                <div className="flex items-baseline gap-3">
                  <span className="index-num shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[0.9375rem] font-500">{p.pergunta}</p>
                    {p.bloco && (
                      <p className="text-[0.8125rem] text-faint">{p.bloco}</p>
                    )}
                    {p.referencia && (
                      <p className="text-[0.8125rem] text-mineral">{p.referencia}</p>
                    )}
                    <p className="mt-1 flex flex-wrap gap-1.5">
                      {p.criticidade === "alta" && <Etiqueta tom="danger">Crítico</Etiqueta>}
                      {p.exigeAcao && <Etiqueta tom="warn">Exige ação</Etiqueta>}
                      {p.documentoVinculado && <Etiqueta tom="mute">Documento</Etiqueta>}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </Painel>
      )}

      {modelos.length === 0 ? (
        <Vazio titulo="Nenhum questionário" />
      ) : (
        <Painel titulo={`${modelos.length} questionário(s)`}>
          <table className="tabela">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Versão</th>
                <th className="num">Perguntas</th>
                <th>Situação</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {modelos.map((m) => (
                <tr key={m.id}>
                  <td>
                    <a href={`/conformidade/modelos?editar=${m.id}`} className="hover:text-accent">
                      {m.nome}
                    </a>
                    {m.descricao && (
                      <p className="text-[0.8125rem] text-faint">{m.descricao}</p>
                    )}
                  </td>
                  <td className="tnum text-muted">v{m.versao}</td>
                  <td className="num">{m.modelo.perguntas.length}</td>
                  <td>
                    {m.ativo ? (
                      <Etiqueta tom="ok">Ativo</Etiqueta>
                    ) : (
                      <Etiqueta tom="mute">Inativo</Etiqueta>
                    )}
                  </td>
                  <td className="num">
                    <div className="flex justify-end gap-2">
                      <form action={duplicarModelo}>
                        <input type="hidden" name="id" value={m.id} />
                        <button type="submit" className="btn btn-fantasma">
                          Duplicar
                        </button>
                      </form>
                      <form action={alternarModelo}>
                        <input type="hidden" name="id" value={m.id} />
                        <button type="submit" className="btn btn-fantasma">
                          {m.ativo ? "Desativar" : "Ativar"}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Painel>
      )}
    </div>
  );
}
