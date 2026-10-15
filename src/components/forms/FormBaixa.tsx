"use client";

import { useActionState } from "react";

import { registrarBaixa, type Estado } from "@/actions/financeiro";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { Icone } from "@/components/Icone";
import { Aviso, Campo, Etiqueta } from "@/components/ui";
import { rotulosFormaPagamento, type Lancamento } from "@/db/schema";
import { hoje } from "@/lib/dates";
import { brl, centavosParaCampo } from "@/lib/money";

/**
 * Baixa de um lançamento.
 *
 * Três movimentos no mesmo formulário, porque na prática é a mesma
 * conversa: o cliente pagou (total ou parte), a Layane deu desconto,
 * ou o lançamento foi gerado errado e precisa voltar.
 *
 * O desconto entra como valor negativo no histórico — o sistema guarda
 * as duas verdades: quanto foi cobrado e quanto entrou de verdade.
 */
export function FormBaixa({
  lancamento,
  onFechar,
}: {
  lancamento: Lancamento;
  onFechar?: () => void;
}) {
  const [estado, acao] = useActionState<Estado, FormData>(registrarBaixa, {});
  const saldo = lancamento.valor;

  return (
    <form action={acao} className="flex flex-col gap-4">
      <input type="hidden" name="lancamentoId" value={lancamento.id} />

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="label">Dar baixa</p>
          <p className="mt-0.5 text-[0.9375rem] font-500">{lancamento.descricao}</p>
          <p className="text-[0.8125rem] text-muted">
            Cobrado <span className="tnum">{brl(lancamento.valor)}</span> · saldo em aberto{" "}
            <span className="tnum">{brl(saldo)}</span>
          </p>
        </div>
        {onFechar && (
          <button type="button" onClick={onFechar} className="btn btn-fantasma">
            <Icone nome="fechar" tamanho={15} />
            Fechar
          </button>
        )}
      </header>

      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.ok && <Aviso tipo="ok">{estado.ok}</Aviso>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Campo rotulo="Movimento" htmlFor="tipo">
          <select id="tipo" name="tipo" defaultValue="pagamento" className="field">
            <option value="pagamento">Pagamento recebido</option>
            <option value="desconto">Desconto dado</option>
            <option value="estorno">Estorno</option>
          </select>
        </Campo>

        <Campo rotulo="Valor" htmlFor="valor" obrigatorio>
          <input
            id="valor"
            name="valor"
            inputMode="decimal"
            required
            defaultValue={centavosParaCampo(saldo)}
            className="field tnum"
          />
        </Campo>

        <Campo rotulo="Data" htmlFor="data" obrigatorio>
          <input
            id="data"
            name="data"
            type="date"
            required
            defaultValue={hoje()}
            className="field"
          />
        </Campo>

        <Campo rotulo="Forma de pagamento" htmlFor="formaPagamento">
          <select id="formaPagamento" name="formaPagamento" defaultValue="pix" className="field">
            {Object.entries(rotulosFormaPagamento).map(([v, r]) => (
              <option key={v} value={v}>
                {r}
              </option>
            ))}
          </select>
        </Campo>
      </div>

      <Campo rotulo="Observação" htmlFor="observacoes">
        <input
          id="observacoes"
          name="observacoes"
          className="field"
          placeholder="Ex.: pago via Pix, compensado em 3 dias"
        />
      </Campo>

      <div className="flex items-center gap-3">
        <BotaoEnviar variante="primario">
          Registrar baixa
          <Icone nome="seta" tamanho={16} className="seta" />
        </BotaoEnviar>
        <Etiqueta tom="mute">
          Desconto entra como valor negativo no histórico
        </Etiqueta>
      </div>
    </form>
  );
}