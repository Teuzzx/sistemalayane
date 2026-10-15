"use client";

import { useState } from "react";

import { FormBaixa } from "@/components/forms/FormBaixa";
import { Etiqueta, EtiquetaStatus, Painel, Vazio } from "@/components/ui";
import { Icone } from "@/components/Icone";
import { rotulosFormaPagamento, type Lancamento } from "@/db/schema";
import { formatarData, hoje, prazoRelativo } from "@/lib/dates";
import { brl } from "@/lib/money";

/**
 * Tabela financeira do cliente, com a baixa embutida.
 *
 * Separada do Server Component porque dá baixa e precisa de estado
 * local: qual lançamento está aberto para baixa agora.
 */
export function TabelaFinanceiroCliente({
  lancamentos,
  clienteId,
}: {
  lancamentos: Lancamento[];
  clienteId: string;
}) {
  const [aberto, setAberto] = useState<string | null>(null);

  const emAtraso = (l: Lancamento) =>
    l.status === "pendente" && !!l.vencimento && l.vencimento < hoje();

  const alvo = lancamentos.find((l) => l.id === aberto);

  return (
    <>
      <Painel
        titulo="Financeiro do cliente"
        descricao="O que foi cobrado, o que entrou e o que ainda está em aberto."
        acoes={
          <a href={`/financeiro?clienteId=${clienteId}`} className="btn btn-secundario">
            <Icone nome="mais" tamanho={15} />
            Novo lançamento
          </a>
        }
      >
        {lancamentos.length === 0 ? (
          <Vazio
            titulo="Nada lançado"
            texto="As parcelas do contrato entram aqui automaticamente."
          />
        ) : (
          <table className="tabela">
            <thead>
              <tr>
                <th>Descrição</th>
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
                  <td className="tnum">
                    <span className={emAtraso(l) ? "text-danger" : "text-muted"}>
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
                      <EtiquetaStatus rotulo="Pago" />
                    ) : emAtraso(l) ? (
                      <EtiquetaStatus rotulo="Atrasado" />
                    ) : l.status === "cancelado" ? (
                      <Etiqueta tom="mute">Cancelado</Etiqueta>
                    ) : (
                      <EtiquetaStatus rotulo="Pendente" />
                    )}
                    {l.formaPagamento && l.status === "pago" && (
                      <p className="mt-1 text-[0.8125rem] text-faint">
                        {rotulosFormaPagamento[l.formaPagamento]}
                      </p>
                    )}
                  </td>
                  <td className="num">
                    <span className="block">{brl(l.valor)}</span>
                    {l.status === "pago" && l.valorRecebido !== l.valor && (
                      <span className="block text-[0.8125rem] text-faint">
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
                        {aberto === l.id ? "Fechar" : "Dar baixa"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Painel>

      {alvo && (
        <div className="mt-6 border-t border-line pt-6">
          <FormBaixa lancamento={alvo} onFechar={() => setAberto(null)} />
        </div>
      )}
    </>
  );
}