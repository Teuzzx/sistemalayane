"use client";

import { useActionState } from "react";

import { salvarContrato, type Estado } from "@/actions/comercial";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { Icone } from "@/components/Icone";
import { Aviso, Campo } from "@/components/ui";
import { hoje } from "@/lib/dates";
import { centavosParaCampo } from "@/lib/money";

/**
 * Formulário de contrato.
 *
 * O documento sai preenchido com o que está aqui — escopo, investimento,
 * obrigações. O que a Layane escreve uma vez vira o texto do contrato
 * impresso, sem retipar.
 */
export function FormContrato({
  clientes,
  clienteFixo,
  contrato,
}: {
  clientes: { id: string; nome: string }[];
  clienteFixo?: string;
  contrato?: {
    id: string;
    clienteId: string;
    titulo: string;
    inicio: string | null;
    fim: string | null;
    valorTotal: number;
    formaPagamento: string | null;
    parcelas: number;
    intervaloParcelasDias: number;
    escopo: string | null;
    investimento: string | null;
    formaDePagamentoTexto: string | null;
    obrigacoes: string | null;
    confidencialidade: string | null;
    rescisao: string | null;
    observacoes: string | null;
  };
}) {
  const [estado, acao] = useActionState<Estado, FormData>(salvarContrato, {});
  const editando = Boolean(contrato?.id);

  return (
    <form action={acao} className="flex flex-col gap-7">
      {contrato?.id && <input type="hidden" name="id" value={contrato.id} />}

      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.ok && <Aviso tipo="ok">{estado.ok}</Aviso>}

      <section>
        <Bloco titulo="Identificação" descricao="Quem contrata e pelo quê.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo rotulo="Cliente" htmlFor="clienteId" obrigatorio>
              <select
                id="clienteId"
                name="clienteId"
                required
                defaultValue={clienteFixo ?? contrato?.clienteId ?? ""}
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

            <Campo rotulo="Título do contrato" htmlFor="titulo" obrigatorio>
              <input
                id="titulo"
                name="titulo"
                required
                defaultValue={contrato?.titulo ?? ""}
                className="field"
                placeholder="Ex.: acompanhamento ambiental — 6 meses"
              />
            </Campo>
          </div>
        </Bloco>
      </section>

      <section>
        <Bloco titulo="Vigência e valores" descricao="O prazo e o que se paga.">
          <div className="grid gap-4 sm:grid-cols-3">
            <Campo rotulo="Início" htmlFor="inicio" obrigatorio>
              <input
                id="inicio"
                name="inicio"
                type="date"
                required
                defaultValue={contrato?.inicio ?? hoje()}
                className="field"
              />
            </Campo>

            <Campo rotulo="Fim" htmlFor="fim" dica="Deixe vazio para vigência aberta.">
              <input
                id="fim"
                name="fim"
                type="date"
                defaultValue={contrato?.fim ?? ""}
                className="field"
              />
            </Campo>

            <Campo rotulo="Valor total (R$)" htmlFor="valorTotal" obrigatorio>
              <input
                id="valorTotal"
                name="valorTotal"
                inputMode="decimal"
                required
                defaultValue={contrato ? centavosParaCampo(contrato.valorTotal) : ""}
                className="field tnum"
                placeholder="0,00"
              />
            </Campo>

            <Campo rotulo="Parcelas" htmlFor="parcelas">
              <input
                id="parcelas"
                name="parcelas"
                type="number"
                min={1}
                max={60}
                defaultValue={contrato?.parcelas ?? 1}
                className="field tnum"
              />
            </Campo>

            <Campo rotulo="Intervalo entre parcelas (dias)" htmlFor="intervaloParcelasDias">
              <input
                id="intervaloParcelasDias"
                name="intervaloParcelasDias"
                type="number"
                min={1}
                max={180}
                defaultValue={contrato?.intervaloParcelasDias ?? 30}
                className="field tnum"
              />
            </Campo>

            <Campo rotulo="Forma de pagamento" htmlFor="formaPagamento">
              <select
                id="formaPagamento"
                name="formaPagamento"
                defaultValue={contrato?.formaPagamento ?? ""}
                className="field"
              >
                <option value="">—</option>
                <option value="Pix">Pix</option>
                <option value="Boleto">Boleto</option>
                <option value="Transferência">Transferência</option>
                <option value="Cartão de crédito">Cartão de crédito</option>
                <option value="Dinheiro">Dinheiro</option>
              </select>
            </Campo>
          </div>

          {!editando && (
            <div className="mt-4 border border-line bg-surface px-4 py-3.5">
              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  name="gerarParcelas"
                  value="true"
                  defaultChecked
                  className="mt-0.5 accent-deep"
                />
                <span>
                  <span className="block text-[0.875rem] font-500">
                    Lançar as parcelas no financeiro agora
                  </span>
                  <span className="block text-[0.8125rem] text-muted">
                    Cada parcela entra como conta a receber, com vencimento e cliente.
                    Re-salvar o contrato não duplica nada.
                  </span>
                </span>
              </label>

              <div className="mt-3 pl-7">
                <Campo rotulo="Cronograma" htmlFor="formaCronograma">
                  <select id="formaCronograma" name="formaCronograma" defaultValue="entrada" className="field max-w-[280px]">
                    <option value="entrada">Entrada (30%) + parcelas</option>
                    <option value="pro_rata">Parcelas iguais</option>
                  </select>
                </Campo>
              </div>
            </div>
          )}
        </Bloco>
      </section>

      <section>
        <Bloco
          titulo="Texto do contrato"
          descricao="O que você escreve aqui aparece no documento impresso."
        >
          <div className="flex flex-col gap-4">
            <Campo rotulo="Escopo" htmlFor="escopo" dica="O que será feito, com que frequência.">
              <textarea id="escopo" name="escopo" rows={5} defaultValue={contrato?.escopo ?? ""} className="field" />
            </Campo>

            <Campo rotulo="Investimento" htmlFor="investimento">
              <textarea
                id="investimento"
                name="investimento"
                rows={2}
                defaultValue={contrato?.investimento ?? ""}
                className="field"
                placeholder="Observações sobre o valor — deslocamentos, materiais, hora extra…"
              />
            </Campo>

            <Campo rotulo="Forma de pagamento (texto)" htmlFor="formaDePagamentoTexto">
              <textarea
                id="formaDePagamentoTexto"
                name="formaDePagamentoTexto"
                rows={3}
                defaultValue={contrato?.formaDePagamentoTexto ?? ""}
                className="field"
                placeholder="Ex.: 30% na assinatura e o restante em 5 parcelas mensais, via Pix."
              />
            </Campo>

            <Campo rotulo="Obrigações" htmlFor="obrigacoes">
              <textarea
                id="obrigacoes"
                name="obrigacoes"
                rows={3}
                defaultValue={contrato?.obrigacoes ?? ""}
                className="field"
              />
            </Campo>

            <Campo rotulo="Confidencialidade" htmlFor="confidencialidade">
              <textarea
                id="confidencialidade"
                name="confidencialidade"
                rows={2}
                defaultValue={contrato?.confidencialidade ?? ""}
                className="field"
              />
            </Campo>

            <Campo rotulo="Rescisão" htmlFor="rescisao">
              <textarea id="rescisao" name="rescisao" rows={2} defaultValue={contrato?.rescisao ?? ""} className="field" />
            </Campo>
          </div>
        </Bloco>
      </section>

      <div className="border-t border-line pt-5">
        <BotaoEnviar variante="primario">
          {editando ? "Salvar contrato" : "Criar contrato"}
          <Icone nome="seta" tamanho={16} className="seta" />
        </BotaoEnviar>
      </div>
    </form>
  );
}

function Bloco({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="border-b border-line pb-2.5">
        <h2 className="text-[0.9375rem] font-600">{titulo}</h2>
        <p className="mt-0.5 text-[0.8125rem] text-faint">{descricao}</p>
      </header>
      <div className="mt-4">{children}</div>
    </>
  );
}