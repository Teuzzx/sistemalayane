import Link from "next/link";
import { notFound } from "next/navigation";

import { mudarStatusOrcamento } from "@/actions/comercial";
import { ConverterContrato } from "@/components/ConverterContrato";
import { Icone } from "@/components/Icone";
import { FormStatus } from "@/components/FormStatus";
import { rotulosStatusOrcamento } from "@/db/schema";
import { detalheOrcamento } from "@/lib/consultas";
import { formatarData } from "@/lib/dates";
import { brl } from "@/lib/money";
import {
  CabecalhoPagina,
  EtiquetaStatus,
  LinhaDado,
  Painel,
  Regua,
} from "@/components/ui";

export default async function PaginaOrcamento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dados = await detalheOrcamento(id);
  if (!dados) notFound();

  const { orcamento: o, nomeCliente, cnpj } = dados;
  const proximos = ["rascunho", "enviado", "aprovado", "recusado"] as const;

  return (
    <div className="flex flex-col gap-7">
      <CabecalhoPagina
        eyebrow="Comercial"
        titulo={o.titulo}
        descricao={`${o.numero} · ${nomeCliente}`}
        acoes={
          <div className="flex flex-wrap gap-2">
            <EtiquetaStatus rotulo={rotulosStatusOrcamento[o.status]} />
            <Link
              href={`/doc/orcamento/${o.id}`}
              className="btn btn-secundario"
              target="_blank"
            >
              <Icone nome="imprimir" tamanho={15} />
              Ver documento
            </Link>
            {o.status === "rascunho" && (
              <Link href={`/orcamentos/${o.id}/editar`} className="btn btn-secundario">
                <Icone nome="editar" tamanho={15} />
                Editar
              </Link>
            )}
          </div>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        {/* --- Itens --- */}
        <Painel titulo="Itens" descricao={`${o.itens.length} item(ns) cotado(s).`}>
          <table className="tabela">
            <thead>
              <tr>
                <th className="num">#</th>
                <th>Descrição</th>
                <th className="num">Qtd</th>
                <th className="num">Unitário</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {o.itens.map((item, i) => (
                <tr key={i}>
                  <td className="num text-faint">{String(i + 1).padStart(2, "0")}</td>
                  <td>{item.descricao}</td>
                  <td className="num">{item.quantidade}</td>
                  <td className="num">{brl(item.valorUnitario)}</td>
                  <td className="num">{brl(item.quantidade * item.valorUnitario)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-5 flex flex-col">
            <LinhaDado rotulo="Subtotal" valor={brl(o.subtotal)} />
            {o.descontoValor > 0 && (
              <LinhaDado
                rotulo={`Desconto${o.descontoPercentual ? ` (${o.descontoPercentual}%)` : ""}`}
                valor={`− ${brl(o.descontoValor)}`}
                tom="warn"
              />
            )}
            <div className="flex items-baseline justify-between border-b border-line py-3">
              <span className="label text-ink">Total</span>
              <span className="text-[1.375rem] font-500 tnum">{brl(o.total)}</span>
            </div>
          </div>
        </Painel>

        {/* --- Condições + ações --- */}
        <div className="flex flex-col gap-8">
          <Painel titulo="Condições">
            <div className="flex flex-col">
              <LinhaDado rotulo="Cliente" valor={nomeCliente} />
              {cnpj && <LinhaDado rotulo="CNPJ" valor={cnpj} />}
              <LinhaDado
                rotulo="Pagamento"
                valor={o.condicaoPagamento ?? "—"}
              />
              <LinhaDado rotulo="Prazo de entrega" valor={o.prazoEntrega ?? "—"} />
              <LinhaDado rotulo="Válido até" valor={formatarData(o.validoAte)} />
              <LinhaDado rotulo="Criado em" valor={formatarData(o.criadoEm.slice(0, 10))} />
            </div>
            {o.observacoes && (
              <p className="mt-4 border-t border-line pt-4 text-[0.875rem] leading-relaxed whitespace-pre-line text-muted">
                {o.observacoes}
              </p>
            )}
          </Painel>

          {o.status !== "convertido" && (
            <Painel titulo="Situação" descricao="O passo que move a venda adiante.">
              <div className="flex flex-wrap gap-2">
                {proximos.map((s) => (
                  <FormStatus
                    key={s}
                    acao={mudarStatusOrcamento}
                    campos={{ id: o.id, status: s }}
                    rotulo={rotulosStatusOrcamento[s]}
                    ativo={o.status === s}
                  />
                ))}
              </div>
            </Painel>
          )}

          {o.status === "aprovado" && (
            <Painel
              titulo="Fechar em contrato"
              descricao="O contrato nasce com o cronograma de cobrança já lançado."
            >
              <ConverterContrato orcamentoId={o.id} total={o.total} />
            </Painel>
          )}

          {o.status === "convertido" && (
            <Painel titulo="Convertido">
              <p className="text-[0.875rem] text-muted">
                Este orçamento já virou contrato e as parcelas estão no financeiro.
              </p>
              <Link href="/contratos" className="btn btn-secundario mt-3">
                <Icone nome="contratos" tamanho={15} />
                Ver contratos
              </Link>
            </Painel>
          )}
        </div>
      </div>

      <Regua />
    </div>
  );
}