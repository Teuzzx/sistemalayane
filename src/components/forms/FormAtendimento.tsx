"use client";

import { useActionState } from "react";

import { salvarAtendimento, type Estado } from "@/actions/demandas";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { Icone } from "@/components/Icone";
import { Aviso, Campo } from "@/components/ui";
import { rotulosTipoAtendimento } from "@/db/schema";
import { hoje } from "@/lib/dates";

/**
 * Registro de atendimento — a primeira consulta, a segunda, a visita.
 *
 * O campo "próximo passo" é o que dá alma ao sistema: é o combinado
 * que vira lista de trabalho no painel.
 */
export function FormAtendimento({
  clienteId,
  demandas = [],
}: {
  clienteId: string;
  demandas: { id: string; titulo: string }[];
}) {
  const [estado, acao] = useActionState<Estado, FormData>(salvarAtendimento, {});

  return (
    <form action={acao} className="flex flex-col gap-4">
      <input type="hidden" name="clienteId" value={clienteId} />

      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.ok && <Aviso tipo="ok">{estado.ok}</Aviso>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Data" htmlFor="data" obrigatorio>
          <input id="data" name="data" type="date" required defaultValue={hoje()} className="field" />
        </Campo>

        <Campo rotulo="Tipo" htmlFor="tipo">
          <select id="tipo" name="tipo" defaultValue="consulta" className="field">
            {Object.entries(rotulosTipoAtendimento).map(([v, r]) => (
              <option key={v} value={v}>
                {r}
              </option>
            ))}
          </select>
        </Campo>
      </div>

      {demandas.length > 0 && (
        <Campo rotulo="Demanda relacionada" htmlFor="demandaId" dica="Opcional.">
          <select id="demandaId" name="demandaId" defaultValue="" className="field">
            <option value="">— nenhuma —</option>
            {demandas.map((d) => (
              <option key={d.id} value={d.id}>
                {d.titulo}
              </option>
            ))}
          </select>
        </Campo>
      )}

      <Campo rotulo="Assunto" htmlFor="titulo" obrigatorio>
        <input
          id="titulo"
          name="titulo"
          required
          className="field"
          placeholder="Ex.: consulta sobre prazo da licença de operação"
        />
      </Campo>

      <Campo rotulo="O que aconteceu" htmlFor="resumo">
        <textarea
          id="resumo"
          name="resumo"
          rows={4}
          className="field"
          placeholder="Registre o suficiente para lembrar daqui a três meses sem precisar perguntar de novo."
        />
      </Campo>

      <div className="border-t border-line pt-4">
        <p className="label mb-3">O que ficou combinado</p>
        <div className="grid gap-4">
          <Campo rotulo="Próximo passo" htmlFor="proximoPasso">
            <input
              id="proximoPasso"
              name="proximoPasso"
              className="field"
              placeholder="Ex.: mandar proposta de acompanhamento mensal"
            />
          </Campo>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo rotulo="Prazo" htmlFor="dataProximoPasso">
              <input id="dataProximoPasso" name="dataProximoPasso" type="date" className="field" />
            </Campo>

            <Campo rotulo="Duração (min)" htmlFor="duracaoMin">
              <input
                id="duracaoMin"
                name="duracaoMin"
                type="number"
                min={0}
                step={5}
                className="field tnum"
              />
            </Campo>
          </div>
        </div>
      </div>

      <BotaoEnviar variante="primario">
        Registrar
        <Icone nome="seta" tamanho={16} className="seta" />
      </BotaoEnviar>
    </form>
  );
}