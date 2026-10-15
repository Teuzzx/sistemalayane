"use client";

import Link from "next/link";
import { useState } from "react";

import { FormBaixa } from "@/components/forms/FormBaixa";
import { Etiqueta, EtiquetaStatus } from "@/components/ui";
import { rotulosFormaPagamento, type Lancamento } from "@/db/schema";
import { formatarData, prazoRelativo } from "@/lib/dates";
import { brl } from "@/lib/money";

type Linha = Pick<
  Lancamento,
  | "id"
  | "descricao"
  | "valor"
  | "vencimento"
  | "status"
  | "pagoEm"
  | "formaPagamento"
  | "valorRecebido"
  | "observacoes"
  | "clienteId"
> & { cliente: string; atrasado: boolean };

export function TabelaBaixas({
  lancamentos,
  mostrarBaixa,
}: {
  lancamentos: Linha[];
  mostrarBaixa?: boolean;
}) {
  const [aberto, setAberto] = useState<string | null>(
    mostrarBaixa ? lancamentos[0]?.id ?? null : null,
  );

  const alvo = lancamentos.find((l) => l.id === aberto);

  return (
    <div className="flex flex-col gap-6">
      <div className="overflow-x-auto">
        <table className="tabela">
          <thead>
            <tr>
              <th>Descrição</th>
              <th>Cliente</th>
              <th>Vencimento</th>
              <th>Situação</th>
              <th className="num">Valor</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lancamentos.map((l) => (
              <tr key={l.id}>
                <td>
                  {l.descricao}
                  {l.observacoes && (
                    <p className="text-[0.8125rem] text-faint">{l.observacoes}</p>
                  )}
                </td>
                <td>
                  <Link href={`/clientes/${l.clienteId}`} className="hover:text-accent">
                    {l.cliente}
                  </Link>
                </td>
                <td className="tnum">
                  <span className={l.atrasado ? "text-danger" : "text-muted"}>
                    {formatarData(l.vencimento)}
                  </span>
                  {l.status === "pendente" && (
                    <p className="text-[0.8125rem] text-faint">
                      {prazoRelativo(l.vencimento)}
                    </p>
                  )}
                </td>
                <td>
                  {l.status === "pago" ? (
                    <>
                      <EtiquetaStatus rotulo="Pago" />
                      <p className="mt-1 text-[0.8125rem] text-faint">
                        {l.formaPagamento
                          ? rotulosFormaPagamento[l.formaPagamento]
                          : "—"}
                        {l.pagoEm ? ` · ${formatarData(l.pagoEm)}` : ""}
                      </p>
                    </>
                  ) : l.atrasado ? (
                    <EtiquetaStatus rotulo="Atrasado" />
                  ) : l.status === "cancelado" ? (
                    <Etiqueta tom="mute">Cancelado</Etiqueta>
                  ) : (
                    <EtiquetaStatus rotulo="Pendente" />
                  )}
                </td>
                <td className="num">
                  <span className="block">{brl(l.valor)}</span>
                  {l.status === "pago" && l.valorRecebido !== l.valor && (
                    <span className="block text-[0.8125rem] text-warn">
                      recebido {brl(l.valorRecebido)}
                    </span>
                  )}
                </td>
                <td className="num">
                  {l.status === "pendente" && (
                    <button
                      type="button"
                      onClick={() => setAberto(aberto === l.id ? null : l.id)}
                      className="text-[0.75rem] font-600 uppercase tracking-[0.12em] text-accent hover:underline"
                    >
                      {aberto === l.id ? "Fechar" : "Baixa"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {alvo && (
        <div className="border-t border-line pt-6">
          <FormBaixa
            lancamento={alvo as unknown as Lancamento}
            onFechar={() => setAberto(null)}
          />
        </div>
      )}
    </div>
  );
}