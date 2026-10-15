"use client";

import { useActionState } from "react";

import { salvarDespesa, salvarLancamento, type Estado } from "@/actions/financeiro";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { Icone } from "@/components/Icone";
import { Aviso, Campo } from "@/components/ui";
import { rotulosFormaPagamento } from "@/db/schema";
import { hoje } from "@/lib/dates";

export function FormLancamento({
  clientes,
  clienteFixo,
  contratos = [],
  cliente,
  lancamento,
}: {
  clientes: { id: string; nome: string }[];
  clienteFixo?: string;
  contratos?: { id: string; numero: string; titulo: string }[];
  cliente?: string;
  lancamento?: {
    id: string;
    clienteId: string;
    contratoId: string | null;
    descricao: string;
    valor: number;
    vencimento: string | null;
    observacoes: string | null;
  };
}) {
  const [estado, acao] = useActionState<Estado, FormData>(salvarLancamento, {});

  return (
    <form action={acao} className="flex flex-col gap-5">
      {lancamento?.id && <input type="hidden" name="id" value={lancamento.id} />}

      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.ok && <Aviso tipo="ok">{estado.ok}</Aviso>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Cliente" htmlFor="clienteId" obrigatorio>
          {clienteFixo ? (
            <>
              <input type="hidden" name="clienteId" value={clienteFixo} />
              <p className="field flex items-center bg-surface-2 text-muted">
                {cliente}
              </p>
            </>
          ) : (
            <select
              id="clienteId"
              name="clienteId"
              required
              defaultValue={lancamento?.clienteId ?? ""}
              className="field"
            >
              <option value="">Selecione…</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          )}
        </Campo>

        {contratos.length > 0 && (
          <Campo rotulo="Vincular a um contrato" htmlFor="contratoId">
            <select
              id="contratoId"
              name="contratoId"
              defaultValue={lancamento?.contratoId ?? ""}
              className="field"
            >
              <option value="">— avulso —</option>
              {contratos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.numero} · {c.titulo}
                </option>
              ))}
            </select>
          </Campo>
        )}
      </div>

      <Campo rotulo="Descrição" htmlFor="descricao" obrigatorio>
        <input
          id="descricao"
          name="descricao"
          required
          defaultValue={lancamento?.descricao ?? ""}
          className="field"
          placeholder="Ex.: acompanhamento mensal — março"
        />
      </Campo>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Valor" htmlFor="valor" obrigatorio>
          <input
            id="valor"
            name="valor"
            inputMode="decimal"
            required
            defaultValue={
              lancamento
                ? (lancamento.valor / 100).toFixed(2).replace(".", ",")
                : ""
            }
            className="field tnum"
            placeholder="0,00"
          />
        </Campo>

        <Campo rotulo="Vencimento" htmlFor="vencimento" obrigatorio>
          <input
            id="vencimento"
            name="vencimento"
            type="date"
            required
            defaultValue={lancamento?.vencimento ?? hoje()}
            className="field"
          />
        </Campo>
      </div>

      <Campo rotulo="Observações" htmlFor="observacoes">
        <input
          id="observacoes"
          name="observacoes"
          defaultValue={lancamento?.observacoes ?? ""}
          className="field"
        />
      </Campo>

      <BotaoEnviar variante="primario">
        {lancamento?.id ? "Salvar lançamento" : "Criar lançamento"}
        <Icone nome="seta" tamanho={16} className="seta" />
      </BotaoEnviar>
    </form>
  );
}

/* ------------------------------------------------------------------ */

const CATEGORIAS = [
  "Aluguel / escritório",
  "Software e assinaturas",
  "Transporte e combustível",
  "Impostos",
  "Contabilidade",
  "Marketing",
  "Equipamentos",
  "Formação / cursos",
  "Outro",
];

export function FormDespesa() {
  const [estado, acao] = useActionState<Estado, FormData>(salvarDespesa, {});

  return (
    <form action={acao} className="flex flex-col gap-5">
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.ok && <Aviso tipo="ok">{estado.ok}</Aviso>}

      <Campo rotulo="Descrição" htmlFor="descricao" obrigatorio>
        <input id="descricao" name="descricao" required className="field" />
      </Campo>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Categoria" htmlFor="categoria">
          <select id="categoria" name="categoria" defaultValue="" className="field">
            <option value="">—</option>
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Campo>

        <Campo rotulo="Valor" htmlFor="valor" obrigatorio>
          <input
            id="valor"
            name="valor"
            inputMode="decimal"
            required
            className="field tnum"
            placeholder="0,00"
          />
        </Campo>

        <Campo rotulo="Data" htmlFor="data" obrigatorio>
          <input id="data" name="data" type="date" required defaultValue={hoje()} className="field" />
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

      <BotaoEnviar variante="primario">
        Registrar despesa
        <Icone nome="seta" tamanho={16} className="seta" />
      </BotaoEnviar>
    </form>
  );
}