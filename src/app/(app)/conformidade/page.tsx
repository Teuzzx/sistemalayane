import Link from "next/link";

import { Icone } from "@/components/Icone";
import { rotulosStatusConformidade } from "@/db/schema";
import { listarAnalises } from "@/lib/consultas";
import { formatarData } from "@/lib/dates";
import {
  CabecalhoPagina,
  Etiqueta,
  EtiquetaStatus,
  Painel,
  Vazio,
} from "@/components/ui";

export const metadata = { title: "Conformidade" };

const SITUACOES = [
  { v: "", r: "Todas" },
  { v: "em_resposta", r: "Em resposta" },
  { v: "emitido", r: "Emitidos" },
  { v: "enviado", r: "Enviados" },
];

export default async function PaginaConformidade({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const analises = await listarAnalises({ status });

  const emitidas = analises.filter(
    (a) => a.status === "emitido" || a.status === "enviado",
  );
  const comIndice = emitidas.filter((a) => a.indiceConformidade !== null);
  const media = comIndice.length
    ? Math.round(
        comIndice.reduce((a, x) => a + (x.indiceConformidade ?? 0), 0) /
          comIndice.length,
      )
    : null;

  return (
    <div className="flex flex-col gap-7">
      <CabecalhoPagina
        eyebrow="Produto"
        titulo="Relatório de conformidade"
        descricao="O questionário que vira diagnóstico. A Layane responde com o cliente, o sistema escreve o parecer e entrega o documento."
        acoes={
          <div className="flex flex-wrap gap-2">
            <Link href="/conformidade/modelos" className="btn btn-secundario">
              <Icone nome="config" tamanho={15} />
              Questionários
            </Link>
            <Link href="/conformidade/nova" className="btn btn-primario">
              <Icone nome="mais" tamanho={16} />
              Novo diagnóstico
            </Link>
          </div>
        }
      />

      {emitidas.length > 0 && media !== null && (
        <div className="grid grid-cols-3 gap-x-6 gap-y-4">
          <div className="border-t border-line pt-3">
            <p className="label">Relatórios emitidos</p>
            <p className="mt-1 text-[1.5rem] leading-none font-500 tnum">{emitidas.length}</p>
          </div>
          <div className="border-t border-line pt-3">
            <p className="label">Índice médio</p>
            <p
              className={`mt-1 text-[1.5rem] leading-none font-500 tnum ${media < 60 ? "text-warn" : media >= 80 ? "text-ok" : ""}`}
            >
              {media}%
            </p>
          </div>
          <div className="border-t border-line pt-3">
            <p className="label">Em resposta</p>
            <p className="mt-1 text-[1.5rem] leading-none font-500 tnum">
              {analises.filter((a) => a.status === "em_resposta").length}
            </p>
          </div>
        </div>
      )}

      <nav className="flex flex-wrap gap-1.5 border-b border-line pb-4">
        {SITUACOES.map((s) => {
          const ativo = (status ?? "") === s.v;
          return (
            <Link
              key={s.v || "todas"}
              href={`/conformidade?${s.v ? `status=${s.v}` : ""}`}
              className={[
                "rounded-full border px-3 py-1.5 text-[0.75rem] transition-colors duration-150",
                ativo
                  ? "border-deep bg-deep text-on-deep"
                  : "border-line-strong text-muted hover:border-accent hover:text-ink",
              ].join(" ")}
            >
              {s.r}
            </Link>
          );
        })}
      </nav>

      {analises.length === 0 ? (
        <Vazio
          titulo="Nenhum diagnóstico ainda"
          texto="Escolha um cliente e um questionário. O relatório sai com índice, itens críticos e o parecer escrito."
          acao={
            <Link href="/conformidade/nova" className="btn btn-primario">
              Iniciar diagnóstico
            </Link>
          }
        />
      ) : (
        <Painel titulo={`${analises.length} análise(s)`}>
          <div className="overflow-x-auto">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Análise</th>
                  <th>Questionário</th>
                  <th>Situação</th>
                  <th>Índice</th>
                  <th>Emitido</th>
                </tr>
              </thead>
              <tbody>
                {analises.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <Link href={`/clientes/${a.clienteId}`} className="hover:text-accent">
                        {a.cliente}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/conformidade/${a.id}`} className="hover:text-accent">
                        {a.titulo}
                      </Link>
                    </td>
                    <td className="text-muted">{a.modelo}</td>
                    <td>
                      <EtiquetaStatus rotulo={rotulosStatusConformidade[a.status]} />
                    </td>
                    <td className="num">
                      {a.indiceConformidade !== null ? (
                        <Etiqueta
                          tom={
                            a.indiceConformidade >= 80
                              ? "ok"
                              : a.indiceConformidade >= 50
                                ? "warn"
                                : "danger"
                          }
                        >
                          {a.indiceConformidade}%
                        </Etiqueta>
                      ) : (
                        <span className="text-faint">—</span>
                      )}
                    </td>
                    <td className="tnum text-muted">{formatarData(a.emitidoEm)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Painel>
      )}
    </div>
  );
}