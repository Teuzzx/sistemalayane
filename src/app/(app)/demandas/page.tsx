import Link from "next/link";
import { exigirSecao } from "@/lib/exigir";

import { FormDemanda } from "@/components/forms/FormDemanda";
import { Icone } from "@/components/Icone";
import { rotulosStatusDemanda } from "@/db/schema";
import { funil, listarDemandas, opcoesClientes, opcoesServicos } from "@/lib/consultas";
import { formatarData } from "@/lib/dates";
import { brl } from "@/lib/money";
import {
  CabecalhoPagina,
  EtiquetaStatus,
  Painel,
  Vazio,
} from "@/components/ui";

export const metadata = { title: "Demandas" };

export default async function PaginaDemandas({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; clienteId?: string; novo?: string }>;
}) {
  await exigirSecao("demandas");

  const { status, clienteId, novo } = await searchParams;

  const [demandas, funilDados, clientes, servicos] = await Promise.all([
    listarDemandas({ status, clienteId }),
    funil(),
    opcoesClientes(),
    opcoesServicos(),
  ]);

  const etapas = [
    { v: "", r: "Todas" },
    ...funilDados.map((f) => ({ v: f.status, r: f.rotulo })),
    { v: "cancelado", r: "Canceladas" },
  ];

  const clienteFixo = clientes.find((c) => c.id === clienteId);
  const total = funilDados
    .filter((f) => f.status !== "concluido")
    .reduce((a, f) => a + f.valor, 0);

  return (
    <div className="flex flex-col gap-7">
      <CabecalhoPagina
        eyebrow="Funil"
        titulo="Demandas"
        descricao="Cada pedido que entra vira uma linha aqui e caminha até virar contrato."
        acoes={
          <Link href="/demandas?novo=1" className="btn btn-primario">
            <Icone nome="mais" tamanho={16} />
            Nova demanda
          </Link>
        }
      />

      <nav className="flex flex-wrap gap-1.5 border-b border-line pb-4">
        {etapas.map((e) => {
          const ativo = (status ?? "") === e.v;
          const n = funilDados.find((f) => f.status === e.v)?.n;
          return (
            <Link
              key={e.v || "todas"}
              href={`/demandas?${new URLSearchParams({ ...(e.v ? { status: e.v } : {}), ...(clienteId ? { clienteId } : {}) })}`}
              className={[
                "rounded-full border px-3 py-1.5 text-[0.75rem] transition-colors duration-150",
                ativo
                  ? "border-deep bg-deep text-on-deep"
                  : "border-line-strong text-muted hover:border-accent hover:text-ink",
              ].join(" ")}
            >
              {e.r}
              {n !== undefined && n > 0 && (
                <span className={`ml-1.5 tnum ${ativo ? "text-on-deep/70" : "text-faint"}`}>
                  {n}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {clienteFixo && (
        <p className="flex items-center gap-2 text-[0.875rem] text-muted">
          Filtrando por
          <strong className="font-500 text-ink">{clienteFixo.nome}</strong>
          <Link href="/demandas" className="text-accent hover:underline">
            limpar
          </Link>
        </p>
      )}

      {novo && (
        <Painel titulo="Abrir demanda" descricao="Descreva o que o cliente precisa.">
          <FormDemanda clientes={clientes} servicos={servicos} clienteFixo={clienteId} />
        </Painel>
      )}

      {demandas.length === 0 ? (
        <Vazio
          titulo={status ? "Nada nesta etapa" : "Nenhuma demanda registrada"}
          texto="Toda conversa que vira trabalho começa aqui."
          acao={
            <Link href="/demandas?novo=1" className="btn btn-primario">
              Abrir a primeira demanda
            </Link>
          }
        />
      ) : (
        <Painel
          titulo={`${demandas.length} demanda${demandas.length === 1 ? "" : "s"}`}
          descricao={
            total > 0 ? `Valor em jogo no funil aberto: ${brl(total)}` : undefined
          }
        >
          <div className="overflow-x-auto">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Demanda</th>
                  <th>Cliente</th>
                  <th>Etapa</th>
                  <th>Chance</th>
                  <th>Abertura</th>
                  <th className="num">Valor</th>
                </tr>
              </thead>
              <tbody>
                {demandas.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <p className="font-500">{d.titulo}</p>
                      {d.servico && (
                        <p className="text-[0.8125rem] text-faint">{d.servico}</p>
                      )}
                    </td>
                    <td>
                      <Link
                        href={`/clientes/${d.clienteId}`}
                        className="hover:text-accent"
                      >
                        {d.cliente}
                      </Link>
                    </td>
                    <td>
                      <EtiquetaStatus rotulo={rotulosStatusDemanda[d.status]} />
                    </td>
                    <td className="tnum text-muted">{d.probabilidade}%</td>
                    <td className="tnum text-muted">
                      {formatarData(d.dataAbertura)}
                      {d.prazoDias ? (
                        <p className="text-[0.8125rem] text-faint">prazo {d.prazoDias}d</p>
                      ) : null}
                    </td>
                    <td className="num">{brl(d.valorEstimado)}</td>
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