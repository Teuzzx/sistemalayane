import Link from "next/link";
import { exigirSecao } from "@/lib/exigir";

import { Icone } from "@/components/Icone";
import { rotulosStatusOrcamento } from "@/db/schema";
import { listarOrcamentos } from "@/lib/consultas";
import { formatarData } from "@/lib/dates";
import { brl } from "@/lib/money";
import {
  CabecalhoPagina,
  EtiquetaStatus,
  Painel,
  Vazio,
} from "@/components/ui";

export const metadata = { title: "Orçamentos" };

const SITUACOES = [
  { v: "", r: "Todos" },
  { v: "rascunho", r: "Rascunho" },
  { v: "enviado", r: "Enviados" },
  { v: "aprovado", r: "Aprovados" },
  { v: "recusado", r: "Recusados" },
  { v: "convertido", r: "Viraram contrato" },
];

export default async function PaginaOrcamentos({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await exigirSecao("orcamentos");

  const { status } = await searchParams;
  const orcamentos = await listarOrcamentos({ status });

  const emAberto = orcamentos
    .filter((o) => o.status === "enviado" || o.status === "aprovado")
    .reduce((a, o) => a + o.total, 0);

  return (
    <div className="flex flex-col gap-7">
      <CabecalhoPagina
        eyebrow="Comercial"
        titulo="Orçamentos"
        descricao="A proposta vai, o cliente responde. Aprovado vira contrato — e o contrato gera as parcelas."
        acoes={
          <Link href="/orcamentos/novo" className="btn btn-primario">
            <Icone nome="mais" tamanho={16} />
            Novo orçamento
          </Link>
        }
      />

      <nav className="flex flex-wrap gap-1.5 border-b border-line pb-4">
        {SITUACOES.map((s) => {
          const ativo = (status ?? "") === s.v;
          return (
            <Link
              key={s.v || "todos"}
              href={`/orcamentos?${s.v ? `status=${s.v}` : ""}`}
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

      {orcamentos.length === 0 ? (
        <Vazio
          titulo="Nenhum orçamento"
          texto="Monte a proposta com os itens do serviço. O desconto entra no cálculo e o documento sai pronto para enviar."
          acao={
            <Link href="/orcamentos/novo" className="btn btn-primario">
              Montar orçamento
            </Link>
          }
        />
      ) : (
        <Painel
          titulo={`${orcamentos.length} orçamento${orcamentos.length === 1 ? "" : "s"}`}
          descricao={emAberto > 0 ? `Valor aguardando resposta: ${brl(emAberto)}` : undefined}
        >
          <div className="overflow-x-auto">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Cliente</th>
                  <th>Título</th>
                  <th>Situação</th>
                  <th>Válido até</th>
                  <th className="num">Desconto</th>
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {orcamentos.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link href={`/orcamentos/${o.id}`} className="tnum hover:text-accent">
                        {o.numero}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/clientes/${o.clienteId}`} className="hover:text-accent">
                        {o.cliente}
                      </Link>
                    </td>
                    <td>{o.titulo}</td>
                    <td>
                      <EtiquetaStatus rotulo={rotulosStatusOrcamento[o.status]} />
                    </td>
                    <td className="tnum text-muted">{formatarData(o.validoAte)}</td>
                    <td className="num text-muted">
                      {o.descontoValor > 0 ? brl(o.descontoValor) : "—"}
                    </td>
                    <td className="num font-500">{brl(o.total)}</td>
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