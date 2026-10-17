"use client";

/**
 * Cobrança em lote.
 *
 * A parte que mais importa não é o envio — é a **prévia**. Nenhum
 * disparo em lote acontece sem a Layane ver a lista de destinatários e
 * o valor total antes de confirmar. Dispara errado em lote não tem como
 * desfazer: o e-mail já saiu para o cliente.
 *
 * Os dois botões (rascunho / enviar) usam a mesma action com um campo
 * diferente, para o caminho de rascunho e o de envio não divirjam em
 * nenhuma outra linha.
 */

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  cobrarSelecionados,
  prepararCobranca,
  type EstadoEnvio,
} from "@/actions/mensagens";
import { Aviso, Botao, Etiqueta, Painel, type Tom } from "@/components/ui";
import { brl } from "@/lib/money";
import { formatarData } from "@/lib/dates";
import { pluralizar } from "@/lib/utils";

type Plano = Awaited<ReturnType<typeof prepararCobranca>>;

const ESTADO_INICIAL: EstadoEnvio = {};

const ROTULO_URGENCIA: Record<string, { texto: string; tom: Tom }> = {
  atraso: { texto: "Em atraso", tom: "danger" },
  urgente: { texto: "Vence logo", tom: "warn" },
  vencimento: { texto: "A vencer", tom: "mute" },
};

function Disparar({ rotulo }: { rotulo: string }) {
  const { pending } = useFormStatus();
  return (
    <Botao type="submit" variante="primario" disabled={pending}>
      {pending ? "Processando…" : rotulo}
    </Botao>
  );
}

function Rascunho() {
  const { pending } = useFormStatus();
  return (
    <Botao
      type="submit"
      variante="secundario"
      disabled={pending}
      name="rascunho"
      value="sim"
    >
      {pending ? "Salvando…" : "Guardar sem enviar"}
    </Botao>
  );
}

/**
 * Cartão de cobrança em lote.
 *
 * Fica inteiro no cliente, sem casca de servidor: os dados chegam pela
 * `prepararCobranca`, chamada no clique. Envolver isto num `async
 * function` não funciona — o arquivo já é `"use client"`, e o Next
 * rejeita componente assíncrono do lado do cliente com "Only Server
 * Components can be async".
 */
export function PainelCobranca() {
  const [plano, setPlano] = useState<Plano | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [estado, formAction] = useActionState(cobrarSelecionados, ESTADO_INICIAL);

  const abrir = async () => {
    setCarregando(true);
    try {
      setPlano(await prepararCobranca());
    } finally {
      setCarregando(false);
    }
  };

  return (
    <Painel
      titulo="Cobrança em lote"
      descricao="Quem está para vencer ou já venceu, e quem ainda não recebeu aviso."
      solido
      acoes={
        !plano ? (
          <Botao type="button" variante="secundario" onClick={abrir} disabled={carregando}>
            {carregando ? "Calculando…" : "Ver quem vai receber"}
          </Botao>
        ) : undefined
      }
    >
      {!plano ? (
        <p className="text-[0.875rem] text-muted">
          Nada é enviado sem você ver a lista antes. Clique em{" "}
          <strong>Ver quem vai receber</strong> para o sistema montar a
          cobrança de quem está vencendo ou atrasado — e mostrar quem ficou
          de fora, e por quê.
        </p>
      ) : plano.itens.length === 0 ? (
        <Aviso tipo="ok">
          <strong>Nada a cobrar agora.</strong> Nenhum lançamento está na
          janela de aviso — ou está tudo em dia, ou os vencimentos ainda
          estão longe demais.
        </Aviso>
      ) : (
        <form action={formAction} className="grid gap-4">
          <p className="text-[0.875rem] text-muted">
            <strong className="text-bright">{plano.itens.length}</strong>{" "}
            {pluralizar(plano.itens.length, "lançamento", "lançamentos")},{" "}
            <strong className="text-bright">{brl(plano.totalCentavos)}</strong>{" "}
            no total. Confira a lista antes de confirmar.
          </p>

          <div className="overflow-x-auto">
            <table className="tabela tabela-compacta">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Descrição</th>
                  <th>Valor</th>
                  <th>Vencimento</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {plano.itens.map((i) => {
                  const u = ROTULO_URGENCIA[i.urgencia];
                  return (
                    <tr key={i.lancamentoId}>
                      {/* O id viaja escondido no formulário. É ele que
                          limita o lote ao que a Layane marcou. */}
                      <td className="hidden">
                        <input type="hidden" name="lancamentoId" value={i.lancamentoId} />
                      </td>
                      <td>
                        <span className="block text-bright">{i.clienteNome}</span>
                        <span className="block text-[0.75rem] text-faint">{i.email}</span>
                      </td>
                      <td className="max-w-[24ch] text-[0.8125rem]">{i.descricao}</td>
                      <td className="num whitespace-nowrap">{brl(i.valorCentavos)}</td>
                      <td className="whitespace-nowrap tnum text-[0.8125rem]">
                        {formatarData(i.vencimento)}
                      </td>
                      <td>
                        <Etiqueta tom={u.tom}>{u.texto}</Etiqueta>
                        {i.dias < 0 && (
                          <span className="mt-1 block text-[0.6875rem] text-faint tnum">
                            {pluralizar(Math.abs(i.dias), "dia", "dias")}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {plano.ignorados.length > 0 && (
            <details className="rounded-[var(--radius-painel)] border border-[var(--vidro-fio)] bg-[rgba(244,241,232,0.02)] px-4 py-3">
              <summary className="cursor-pointer text-[0.8125rem] text-muted">
                {pluralizar(plano.ignorados.length, "lançamento ficou", "lançamentos ficaram")} de fora —
                ver o motivo
              </summary>
              <ul className="mt-3 grid gap-1.5">
                {plano.ignorados.map((ig) => (
                  <li key={ig.lancamentoId} className="text-[0.75rem] text-faint">
                    <span className="text-muted">{ig.clienteNome}</span> — {ig.motivo}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {estado.erro && (
            <p role="alert" className="text-[0.8125rem] text-danger">
              {estado.erro}
            </p>
          )}
          {estado.ok && (
            <p role="status" className="text-[0.8125rem] text-ok">
              {estado.ok}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Disparar rotulo={`Enviar cobrança para ${plano.itens.length}`} />
            <Rascunho />
            <Botao type="button" variante="fantasma" onClick={() => setPlano(null)}>
              Cancelar
            </Botao>
          </div>
        </form>
      )}
    </Painel>
  );
}
