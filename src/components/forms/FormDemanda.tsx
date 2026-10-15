"use client";

import { useActionState } from "react";

import { salvarDemanda, type Estado } from "@/actions/demandas";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { Icone } from "@/components/Icone";
import { Aviso, Campo } from "@/components/ui";
import { rotulosStatusDemanda } from "@/db/schema";
import { hoje } from "@/lib/dates";
import { centavosParaCampo } from "@/lib/money";

export function FormDemanda({
  clientes,
  servicos,
  clienteFixo,
  demanda,
}: {
  clientes: { id: string; nome: string }[];
  servicos: { id: string; nome: string; precoPadrao: number }[];
  clienteFixo?: string;
  demanda?: {
    id: string;
    clienteId: string;
    titulo: string;
    servicoId: string | null;
    descricao: string | null;
    status: string;
    valorEstimado: number;
    probabilidade: number;
    prazoDias: number | null;
    dataAbertura: string | null;
  };
}) {
  const [estado, acao] = useActionState<Estado, FormData>(salvarDemanda, {});

  return (
    <form action={acao} className="flex flex-col gap-5">
      {demanda?.id && <input type="hidden" name="id" value={demanda.id} />}

      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.ok && <Aviso tipo="ok">{estado.ok}</Aviso>}

      <Campo rotulo="Cliente" htmlFor="clienteId" obrigatorio>
        <select
          id="clienteId"
          name="clienteId"
          required
          defaultValue={clienteFixo ?? demanda?.clienteId ?? ""}
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

      <Campo rotulo="O que o cliente precisa" htmlFor="titulo" obrigatorio>
        <input
          id="titulo"
          name="titulo"
          required
          defaultValue={demanda?.titulo ?? ""}
          className="field"
          placeholder="Ex.: licenciamento de operação para unidade de Teresina"
        />
      </Campo>

      <Campo rotulo="Serviço do catálogo" htmlFor="servicoId" dica="Opcional — ajude a padronizar preço e escopo.">
        <select
          id="servicoId"
          name="servicoId"
          defaultValue={demanda?.servicoId ?? ""}
          className="field"
        >
          <option value="">— sob medida —</option>
          {servicos.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome}
            </option>
          ))}
        </select>
      </Campo>

      <Campo rotulo="Detalhamento" htmlFor="descricao">
        <textarea
          id="descricao"
          name="descricao"
          rows={4}
          defaultValue={demanda?.descricao ?? ""}
          className="field"
        />
      </Campo>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Etapa do funil" htmlFor="status">
          <select id="status" name="status" defaultValue={demanda?.status ?? "consulta"} className="field">
            {Object.entries(rotulosStatusDemanda).map(([v, r]) => (
              <option key={v} value={v}>
                {r}
              </option>
            ))}
          </select>
        </Campo>

        <Campo rotulo="Valor considerado" htmlFor="valorEstimado">
          <input
            id="valorEstimado"
            name="valorEstimado"
            inputMode="decimal"
            defaultValue={demadaValor(demanda?.valorEstimado)}
            className="field tnum"
            placeholder="0,00"
          />
        </Campo>

        <Campo
          rotulo="Chance de fechar (%)"
          htmlFor="probabilidade"
          dica="Alimenta a leitura do funil."
        >
          <input
            id="probabilidade"
            name="probabilidade"
            type="number"
            min={0}
            max={100}
            step={5}
            defaultValue={demanda?.probabilidade ?? 10}
            className="field tnum"
          />
        </Campo>

        <Campo rotulo="Prazo de entrega (dias)" htmlFor="prazoDias">
          <input
            id="prazoDias"
            name="prazoDias"
            type="number"
            min={0}
            defaultValue={demanda?.prazoDias ?? ""}
            className="field tnum"
          />
        </Campo>

        <Campo rotulo="Data de abertura" htmlFor="dataAbertura">
          <input
            id="dataAbertura"
            name="dataAbertura"
            type="date"
            defaultValue={demanda?.dataAbertura ?? hoje()}
            className="field"
          />
        </Campo>
      </div>

      <BotaoEnviar variante="primario">
        {demanda?.id ? "Salvar demanda" : "Abrir demanda"}
        <Icone nome="seta" tamanho={16} className="seta" />
      </BotaoEnviar>
    </form>
  );
}

function demadaValor(centavos: number | undefined | null): string {
  return centavos ? centavosParaCampo(centavos) : "";
}