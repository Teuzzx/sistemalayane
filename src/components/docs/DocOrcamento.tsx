import Link from "next/link";

import { DocFolha } from "@/components/DocFolha";
import { dataPorExtenso, formatarData } from "@/lib/dates";
import { brl } from "@/lib/money";
import { mascararDocumento } from "@/lib/utils";

/**
 * Documento imprimível do orçamento.
 *
 * Cabeçalho com identificação, tabela de itens, total e aceite. É o
 * papel que a Layane manda para o cliente pelo WhatsApp e que vira PDF.
 */
export function DocOrcamento({
  o,
  nomeCliente,
  cnpj,
  contato,
}: {
  o: {
    id: string;
    numero: string;
    titulo: string;
    itens: { descricao: string; quantidade: number; valorUnitario: number }[];
    subtotal: number;
    descontoValor: number;
    descontoPercentual: number;
    total: number;
    condicaoPagamento: string | null;
    prazoEntrega: string | null;
    validadeDias: number;
    validoAte: string | null;
    observacoes: string | null;
    criadoEm: string;
  };
  nomeCliente: string;
  cnpj: string | null;
  contato: { nome: string | null; cargo: string | null } | null;
}) {
  return (
    <DocFolha
      tipo="Orçamento"
      titulo={o.numero}
      subtitulo={o.titulo}
      voltar={`/orcamentos/${o.id}`}
    >
      <section className="mb-8">
        <p className="label mb-2">Destinatário</p>
        <p className="text-[1rem] font-500">{nomeCliente}</p>
        {cnpj && <p className="text-[0.875rem] text-muted">CNPJ {mascararDocumento(cnpj)}</p>}
        {contato?.nome && (
          <p className="mt-0.5 text-[0.875rem] text-muted">
            {[contato.nome, contato.cargo].filter(Boolean).join(" · ")}
          </p>
        )}
      </section>

      <section className="mb-8">
        <p className="label mb-3">Escopo dos serviços</p>
        <table className="w-full border-collapse text-[0.875rem]">
          <thead>
            <tr className="border-b border-ink">
              <th className="py-2 text-left label">Item</th>
              <th className="py-2 text-right label">Qtd</th>
              <th className="py-2 text-right label">Unitário</th>
              <th className="py-2 text-right label">Total</th>
            </tr>
          </thead>
          <tbody>
            {o.itens.map((item, i) => (
              <tr key={i} className="border-b border-line align-top">
                <td className="py-3 pr-4">{item.descricao}</td>
                <td className="py-3 text-right tnum">{item.quantidade}</td>
                <td className="py-3 text-right tnum">{brl(item.valorUnitario)}</td>
                <td className="py-3 text-right tnum font-500">
                  {brl(item.quantidade * item.valorUnitario)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-5 ml-auto max-w-[280px]">
          <div className="flex justify-between border-b border-line py-2 text-[0.875rem]">
            <span className="text-muted">Subtotal</span>
            <span className="tnum">{brl(o.subtotal)}</span>
          </div>
          {o.descontoValor > 0 && (
            <div className="flex justify-between border-b border-line py-2 text-[0.875rem]">
              <span className="text-muted">
                Desconto{o.descontoPercentual ? ` (${o.descontoPercentual}%)` : ""}
              </span>
              <span className="tnum">− {brl(o.descontoValor)}</span>
            </div>
          )}
          <div className="flex items-baseline justify-between py-3">
            <span className="label text-ink">Total</span>
            <span className="text-[1.25rem] font-500 tnum">{brl(o.total)}</span>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <p className="label mb-2">Condições</p>
        <ul className="flex flex-col gap-1 text-[0.875rem] text-muted">
          <li>
            <strong className="font-500 text-ink">Pagamento:</strong>{" "}
            {o.condicaoPagamento ?? "a combinar"}
          </li>
          <li>
            <strong className="font-500 text-ink">Prazo de entrega:</strong>{" "}
            {o.prazoEntrega ?? "a combinar"}
          </li>
          <li>
            <strong className="font-500 text-ink">Validade da proposta:</strong>{" "}
            {o.validadeDias} dias
            {o.validoAte && ` — até ${dataPorExtenso(o.validoAte)}`}
          </li>
        </ul>
      </section>

      {o.observacoes && (
        <section className="mb-10">
          <p className="label mb-2">Observações</p>
          <p className="text-[0.875rem] leading-relaxed whitespace-pre-line text-muted">
            {o.observacoes}
          </p>
        </section>
      )}

      <section className="mt-14 grid grid-cols-2 gap-10 text-[0.8125rem]">
        <div>
          <div className="h-12 border-b border-ink" />
          <p className="mt-2">Layane Marques — Gestão Ambiental Aplicada</p>
          <p className="text-muted">Prestadora</p>
        </div>
        <div>
          <div className="h-12 border-b border-ink" />
          <p className="mt-2">{nomeCliente}</p>
          <p className="text-muted">Contratante</p>
        </div>
      </section>

      <p className="mt-8 text-center text-[0.75rem] text-muted">
        {nomeCliente} · orçamento {o.numero} ·{" "}
        <Link href={`/orcamentos/${o.id}`} className="underline">
          ref. interna
        </Link>{" "}
        · emitido em {formatarData(o.criadoEm.slice(0, 10))}
      </p>
    </DocFolha>
  );
}