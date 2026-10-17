import Link from "next/link";
import { exigirSecao } from "@/lib/exigir";

import { Icone } from "@/components/Icone";
import { rotulosStatusContrato } from "@/db/schema";
import { listarContratos } from "@/lib/consultas";
import { formatarData, hoje } from "@/lib/dates";
import { brl } from "@/lib/money";
import {
  CabecalhoPagina,
  EtiquetaStatus,
  Painel,
  Vazio,
} from "@/components/ui";

export const metadata = { title: "Contratos" };

const SITUACOES = [
  { v: "", r: "Todos" },
  { v: "rascunho", r: "Rascunho" },
  { v: "enviado", r: "Enviados" },
  { v: "assinado", r: "Assinados" },
  { v: "ativo", r: "Ativos" },
  { v: "encerrado", r: "Encerrados" },
];

export default async function PaginaContratos({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await exigirSecao("contratos");

  const { status } = await searchParams;
  const contratos = await listarContratos({ status });

  const ativos = contratos.filter((c) => c.status === "ativo" || c.status === "assinado");
  const valorCarteira = ativos.reduce((a, c) => a + c.valorTotal, 0);

  return (
    <div className="flex flex-col gap-7">
      <CabecalhoPagina
        eyebrow="Contratos"
        titulo="Contratos"
        descricao="O que está firmado. Cada contrato ativo tem parcelas acompanhadas no financeiro."
        acoes={
          <Link href="/contratos/novo" className="btn btn-primario">
            <Icone nome="mais" tamanho={16} />
            Novo contrato
          </Link>
        }
      />

      <nav className="flex flex-wrap gap-1.5 border-b border-line pb-4">
        {SITUACOES.map((s) => {
          const ativo = (status ?? "") === s.v;
          return (
            <Link
              key={s.v || "todos"}
              href={`/contratos?${s.v ? `status=${s.v}` : ""}`}
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

      {contratos.length === 0 ? (
        <Vazio
          titulo="Nenhum contrato"
          texto="O contrato fecha o serviço pontual e vira acompanhamento contínuo. Monte aqui ou converta um orçamento aprovado."
          acao={
            <div className="flex flex-wrap gap-2">
              <Link href="/contratos/novo" className="btn btn-primario">
                Montar contrato
              </Link>
              <Link href="/orcamentos?status=aprovado" className="btn btn-secundario">
                Converter orçamento aprovado
              </Link>
            </div>
          }
        />
      ) : (
        <Painel
          titulo={`${contratos.length} contrato${contratos.length === 1 ? "" : "s"}`}
          descricao={
            ativos.length > 0
              ? `Carteira ativa: ${ativos.length} contrato${ativos.length === 1 ? "" : "s"}, ${brl(valorCarteira)} em carteira`
              : undefined
          }
        >
          <div className="overflow-x-auto">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Cliente</th>
                  <th>Título</th>
                  <th>Situação</th>
                  <th>Vigência</th>
                  <th className="num">Parcelas</th>
                  <th className="num">Valor</th>
                </tr>
              </thead>
              <tbody>
                {contratos.map((c) => {
                  const vencido =
                    c.fim && c.fim < hoje() && c.status !== "encerrado";
                  return (
                    <tr key={c.id}>
                      <td>
                        <Link href={`/contratos/${c.id}`} className="tnum hover:text-accent">
                          {c.numero}
                        </Link>
                      </td>
                      <td>
                        <Link href={`/clientes/${c.clienteId}`} className="hover:text-accent">
                          {c.cliente}
                        </Link>
                      </td>
                      <td>{c.titulo}</td>
                      <td>
                        <EtiquetaStatus rotulo={rotulosStatusContrato[c.status]} />
                      </td>
                      <td className="tnum">
                        <span className={vencido ? "text-danger" : "text-muted"}>
                          {formatarData(c.inicio)} — {c.fim ? formatarData(c.fim) : "aberto"}
                        </span>
                      </td>
                      <td className="num">{c.parcelas}×</td>
                      <td className="num font-500">{brl(c.valorTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Painel>
      )}
    </div>
  );
}