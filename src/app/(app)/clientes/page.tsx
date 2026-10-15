import Link from "next/link";

import { listarClientes } from "@/lib/consultas";
import { rotulosStatusCliente, type ClienteStatus } from "@/db/schema";
import { brl } from "@/lib/money";
import { Icone } from "@/components/Icone";
import {
  CabecalhoPagina,
  Etiqueta,
  EtiquetaStatus,
  Vazio,
} from "@/components/ui";

export const metadata = { title: "Clientes" };

export default async function PaginaClientes({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string; status?: string }>;
}) {
  const { busca, status } = await searchParams;

  const clientes = await listarClientes({
    busca,
    status,
    apenasAtivos: status === "ativo",
  });

  const filtros: { v: ClienteStatus | ""; r: string }[] = [
    { v: "", r: "Todos" },
    { v: "ativo", r: "Ativos" },
    { v: "potencial", r: "Potenciais" },
    { v: "inativo", r: "Inativos" },
    { v: "arquivado", r: "Arquivados" },
  ];

  return (
    <div className="flex flex-col gap-7">
      <CabecalhoPagina
        eyebrow="Carteira"
        titulo="Clientes"
        descricao="Todo cliente que já passou por aqui, com o que está em aberto e o que já foi fechado."
        acoes={
          <Link href="/clientes/novo" className="btn btn-primario">
            <Icone nome="mais" tamanho={16} />
            Novo cliente
          </Link>
        }
      />

      {/* Filtros — GET, para a URL continuar sendo a verdade da lista. */}
      <form
        method="GET"
        className="flex flex-wrap items-end gap-3 border-b border-line pb-4"
      >
        <div className="relative min-w-[240px] flex-1">
          <label htmlFor="busca" className="label mb-1.5 block">
            Buscar
          </label>
          <span className="pointer-events-none absolute left-3 top-[38px] text-faint">
            <Icone nome="busca" tamanho={16} />
          </span>
          <input
            id="busca"
            name="busca"
            defaultValue={busca ?? ""}
            placeholder="Nome, cidade, CNPJ ou contato"
            className="field pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pb-0.5">
          {filtros.map((f) => {
            const ativo = (status ?? "") === f.v;
            return (
              <Link
                key={f.v || "todos"}
                href={`/clientes?${new URLSearchParams({
                  ...(busca ? { busca } : {}),
                  ...(f.v ? { status: f.v } : {}),
                })}`}
                className={[
                  "rounded-full border px-3 py-1.5 text-[0.75rem] transition-colors duration-150",
                  ativo
                    ? "border-deep bg-deep text-on-deep"
                    : "border-line-strong text-muted hover:border-accent hover:text-ink",
                ].join(" ")}
              >
                {f.r}
              </Link>
            );
          })}
        </div>

        <button type="submit" className="btn btn-secundario">
          <Icone nome="filtro" tamanho={15} />
          Filtrar
        </button>
      </form>

      {clientes.length === 0 ? (
        <Vazio
          titulo={busca || status ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
          texto={
            busca || status
              ? "Ajuste a busca ou o filtro para ver outros clientes."
              : "Comece cadastrando quem já atendeu — mesmo um contato que não virou contrato."
          }
          acao={
            <Link href="/clientes/novo" className="btn btn-primario">
              <Icone nome="mais" tamanho={16} />
              Cadastrar o primeiro
            </Link>
          }
        />
      ) : (
        <>
          <p className="label">
            {clientes.length} cliente{clientes.length === 1 ? "" : "s"}
          </p>

          <div className="overflow-x-auto">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Situação</th>
                  <th className="num">Em aberto</th>
                  <th className="num">Demandas</th>
                  <th className="num">Contratos</th>
                  <th>Atrasado</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link
                        href={`/clientes/${c.id}`}
                        className="font-500 hover:text-accent"
                      >
                        {c.nome}
                      </Link>
                      <p className="text-[0.8125rem] text-faint">
                        {[c.segmento, c.cidade && [c.cidade, c.uf].filter(Boolean).join("/")]
                          .filter(Boolean)
                          .join(" · ") || "Sem classificação"}
                      </p>
                    </td>

                    <td>
                      <EtiquetaStatus rotulo={rotulosStatusCliente[c.status]} />
                    </td>

                    <td className="num">
                      {c.aReceber > 0 ? (
                        <span>{brl(c.aReceber)}</span>
                      ) : (
                        <span className="text-faint">—</span>
                      )}
                    </td>

                    <td className="num">
                      {c.demandasAbertas > 0 ? (
                        c.demandasAbertas
                      ) : (
                        <span className="text-faint">—</span>
                      )}
                    </td>

                    <td className="num">
                      {c.contratosAtivos > 0 ? (
                        <span className="text-ok">{c.contratosAtivos}</span>
                      ) : (
                        <span className="text-faint">—</span>
                      )}
                    </td>

                    <td>
                      {c.atrasado > 0 ? (
                        <Etiqueta tom="danger">{brl(c.atrasado)}</Etiqueta>
                      ) : (
                        <span className="text-[0.8125rem] text-faint">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}