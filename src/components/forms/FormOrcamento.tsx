"use client";

import { useActionState, useState } from "react";

import { salvarOrcamento, type Estado } from "@/actions/comercial";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { Icone } from "@/components/Icone";
import { Aviso, Campo, Etiqueta } from "@/components/ui";
import type { OrcamentoItem } from "@/db/schema";
import { centavosParaCampo } from "@/lib/money";

type Linha = OrcamentoItem & { chave: number };

let contador = 0;
const novaLinha = (): Linha => ({
  chave: contador++,
  descricao: "",
  quantidade: 1,
  valorUnitario: 0,
});

/**
 * Formulário de orçamento.
 *
 * O total é calculado no servidor (`calcularTotais`) — aqui só mostramos
 * uma prévia para a Layane enxergar o número enquanto digita. Se alguém
 * adulterar o cálculo no navegador, a action recalcula e o valor salvo é o
 * verdadeiro.
 */
export function FormOrcamento({
  clientes,
  clienteFixo,
  demandas = [],
  orcamento,
}: {
  clientes: { id: string; nome: string }[];
  clienteFixo?: string;
  demandas?: { id: string; titulo: string }[];
  orcamento?: {
    id: string;
    clienteId: string;
    demandaId: string | null;
    titulo: string;
    itens: OrcamentoItem[];
    descontoPercentual: number;
    condicaoPagamento: string | null;
    prazoEntrega: string | null;
    validadeDias: number;
    observacoes: string | null;
  };
}) {
  const [estado, acao] = useActionState<Estado, FormData>(salvarOrcamento, {});
  const [itens, setItens] = useState<Linha[]>(
    orcamento?.itens?.length
      ? orcamento.itens.map((i) => ({ ...i, chave: contador++ }))
      : [novaLinha()],
  );
  const [descontoPercentual, setDescontoPercentual] = useState(
    orcamento?.descontoPercentual ?? 0,
  );
  const [descontoValor, setDescontoValor] = useState(0);

  const subtotal = itens.reduce(
    (a, i) => a + i.quantidade * i.valorUnitario,
    0,
  );
  const desconto = Math.min(
    subtotal,
    Math.round((subtotal * descontoPercentual) / 100) + descontoValor,
  );
  const total = Math.max(0, subtotal - desconto);

  const alterar = (chave: number, patch: Partial<Linha>) =>
    setItens((atual) =>
      atual.map((i) => (i.chave === chave ? { ...i, ...patch } : i)),
    );

  return (
    <form action={acao} className="flex flex-col gap-6">
      {orcamento?.id && <input type="hidden" name="id" value={orcamento.id} />}

      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.ok && <Aviso tipo="ok">{estado.ok}</Aviso>}

      <input type="hidden" name="descontoPercentual" value={descontoPercentual} />
      <input type="hidden" name="descontoValor" value={paraTextoValor(descontoValor)} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Cliente" htmlFor="clienteId" obrigatorio>
          <select
            id="clienteId"
            name="clienteId"
            required
            defaultValue={clienteFixo ?? orcamento?.clienteId ?? ""}
            className="field"
          >
            <option value="">Selecione…</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </Campo>

        {demandas.length > 0 && (
          <Campo rotulo="Vem da demanda" htmlFor="demandaId" dica="Opcional.">
            <select
              id="demandaId"
              name="demandaId"
              defaultValue={orcamento?.demandaId ?? ""}
              className="field"
            >
              <option value="">— nenhuma —</option>
              {demandas.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.titulo}
                </option>
              ))}
            </select>
          </Campo>
        )}
      </div>

      <Campo rotulo="Título do orçamento" htmlFor="titulo" obrigatorio>
        <input
          id="titulo"
          name="titulo"
          required
          defaultValue={orcamento?.titulo ?? ""}
          className="field"
          placeholder="Ex.: Acompanhamento ambiental mensal — 6 meses"
        />
      </Campo>

      {/* --- Itens --- */}
      <section>
        <header className="flex items-end justify-between border-b border-line pb-2.5">
          <div>
            <h2 className="text-[0.9375rem] font-600">Itens</h2>
            <p className="mt-0.5 text-[0.8125rem] text-faint">
              O que está sendo cobrado.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setItens((a) => [...a, novaLinha()])}
            className="btn btn-secundario"
          >
            <Icone nome="mais" tamanho={15} />
            Item
          </button>
        </header>

        <div className="mt-4 flex flex-col gap-3">
          {itens.map((item, i) => (
            <div
              key={item.chave}
              className="grid items-end gap-3 border-b border-line pb-3 sm:grid-cols-[auto_1fr_6rem_9rem_auto]"
            >
              <span className="index-num w-6 pb-3">
                {String(i + 1).padStart(2, "0")}
              </span>

              <Campo rotulo="Descrição">
                <input
                  name="item_descricao"
                  defaultValue={item.descricao}
                  onChange={(e) => alterar(item.chave, { descricao: e.target.value })}
                  className="field"
                  placeholder="Ex.: acompanhamento mensal de resíduos e documentação"
                />
              </Campo>

              <Campo rotulo="Qtd">
                <input
                  name="item_qtd"
                  type="number"
                  min={0}
                  step="1"
                  defaultValue={item.quantidade}
                  onChange={(e) =>
                    alterar(item.chave, { quantidade: Number(e.target.value) || 0 })
                  }
                  className="field tnum"
                />
              </Campo>

              <Campo rotulo="Valor unit.">
                <input
                  name="item_valor"
                  inputMode="decimal"
                  defaultValue={
                    item.valorUnitario ? centavosParaCampo(item.valorUnitario) : ""
                  }
                  onChange={(e) => alterar(item.chave, { valorUnitario: paraCentavos(e.target.value) })}
                  className="field tnum"
                  placeholder="0,00"
                />
              </Campo>

              <button
                type="button"
                onClick={() =>
                  setItens((a) => (a.length === 1 ? a : a.filter((x) => x.chave !== item.chave)))
                }
                disabled={itens.length === 1}
                className="btn btn-fantasma mb-0.5 h-11 w-11 p-0 disabled:opacity-30"
                aria-label="Remover item"
              >
                <Icone nome="lixeira" tamanho={16} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* --- Desconto --- */}
      <section className="border border-line bg-surface px-4 py-4">
        <p className="label mb-3">Desconto</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Desconto (%)" htmlFor="dpct">
            <input
              id="dpct"
              type="number"
              min={0}
              max={100}
              value={descontoPercentual}
              onChange={(e) =>
                setDescontoPercentual(Math.max(0, Math.min(100, Number(e.target.value) || 0)))
              }
              className="field tnum"
            />
          </Campo>

          <Campo rotulo="Desconto fixo (R$)" htmlFor="dvalor">
            <input
              id="dvalor"
              inputMode="decimal"
              value={descontoValor ? centavosParaCampo(descontoValor) : ""}
              onChange={(e) => setDescontoValor(paraCentavos(e.target.value) ?? 0)}
              className="field tnum"
              placeholder="0,00"
            />
          </Campo>
        </div>

        <div className="mt-4 flex flex-col gap-0">
          <div className="linha-dado">
            <span className="label">Subtotal</span>
            <span className="tnum">{brlTexto(subtotal)}</span>
          </div>
          {desconto > 0 && (
            <div className="linha-dado">
              <span className="label">Desconto</span>
              <span className="tnum text-warn">− {brlTexto(desconto)}</span>
            </div>
          )}
          <div className="linha-dado">
            <span className="label font-600 text-ink">Total</span>
            <span className="text-[1.125rem] font-500 tnum">{brlTexto(total)}</span>
          </div>
        </div>

        <p className="mt-3">
          <Etiqueta tom="mute">
            O servidor recalcula tudo antes de gravar — o número aqui é só prévia
          </Etiqueta>
        </p>
      </section>

      {/* --- Condições --- */}
      <section>
        <header className="border-b border-line pb-2.5">
          <h2 className="text-[0.9375rem] font-600">Condições</h2>
        </header>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Condição de pagamento" htmlFor="condicaoPagamento">
            <input
              id="condicaoPagamento"
              name="condicaoPagamento"
              defaultValue={orcamento?.condicaoPagamento ?? ""}
              className="field"
              placeholder="Ex.: 30% de entrada + 5 parcelas mensais"
            />
          </Campo>

          <Campo rotulo="Prazo de entrega" htmlFor="prazoEntrega">
            <input
              id="prazoEntrega"
              name="prazoEntrega"
              defaultValue={orcamento?.prazoEntrega ?? ""}
              className="field"
              placeholder="Ex.: 15 dias úteis"
            />
          </Campo>

          <Campo rotulo="Validade da proposta (dias)" htmlFor="validadeDias">
            <input
              id="validadeDias"
              name="validadeDias"
              type="number"
              min={1}
              max={365}
              defaultValue={orcamento?.validadeDias ?? 15}
              className="field tnum"
            />
          </Campo>
        </div>

        <div className="mt-4">
          <Campo rotulo="Observações" htmlFor="observacoes">
            <textarea
              id="observacoes"
              name="observacoes"
              rows={4}
              defaultValue={orcamento?.observacoes ?? ""}
              className="field"
            />
          </Campo>
        </div>
      </section>

      <div className="border-t border-line pt-5">
        <BotaoEnviar variante="primario">
          {orcamento?.id ? "Salvar orçamento" : "Criar orçamento"}
          <Icone nome="seta" tamanho={16} className="seta" />
        </BotaoEnviar>
      </div>
    </form>
  );
}

function paraCentavos(texto: string): number {
  const limpo = texto.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(limpo);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function paraTextoValor(centavos: number): string {
  return centavos ? (centavos / 100).toFixed(2).replace(".", ",") : "";
}

function brlTexto(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}