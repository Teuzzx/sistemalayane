"use client";

import { useActionState, useState } from "react";

import { converterEmContrato, type Estado } from "@/actions/comercial";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { Icone } from "@/components/Icone";
import { Aviso, Campo } from "@/components/ui";
import { hoje } from "@/lib/dates";
import { brl } from "@/lib/money";

/**
 * Conversão de orçamento em contrato.
 *
 * O passo que a Layane descreveu: fez um serviço pontual, entregou, e
 * agora quer fechar seis meses de acompanhamento. Aqui ela escolhe como
 * o dinheiro entra — parcelas iguais ou entrada + resto — e o sistema
 * lança o cronograma todo de uma vez.
 */
export function ConverterContrato({
  orcamentoId,
  total,
}: {
  orcamentoId: string;
  total: number;
}) {
  const [forma, setForma] = useState<"pro_rata" | "entrada">("entrada");
  const [parcelas, setParcelas] = useState(6);
  const [intervalo, setIntervalo] = useState(30);
  const [estado, acao] = useActionState<Estado, FormData>(converterEmContrato, {});

  const porParcela =
    forma === "entrada" && parcelas > 1
      ? Math.round((total * 0.3) / 100) / 100
      : Math.round(total / parcelas) / 100;
  void porParcela;

  return (
    <form action={acao} className="flex flex-col gap-5">
      <input type="hidden" name="orcamentoId" value={orcamentoId} />
      <input type="hidden" name="forma" value={forma} />

      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.ok && <Aviso tipo="ok">{estado.ok}</Aviso>}

      <div className="grid gap-2">
        <p className="label">Como o valor entra</p>

        <label className="flex cursor-pointer items-start gap-2.5 rounded-xs border border-line-strong px-3 py-2.5 has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
          <input
            type="radio"
            name="formaDisplay"
            className="mt-0.5 accent-deep"
            checked={forma === "entrada"}
            onChange={() => setForma("entrada")}
          />
          <span>
            <span className="block text-[0.875rem] font-500">Entrada + parcelas</span>
            <span className="block text-[0.8125rem] text-muted">
              30% na assinatura, o resto em intervalos. É o padrão do mercado.
            </span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-2.5 rounded-xs border border-line-strong px-3 py-2.5 has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
          <input
            type="radio"
            name="formaDisplay"
            className="mt-0.5 accent-deep"
            checked={forma === "pro_rata"}
            onChange={() => setForma("pro_rata")}
          />
          <span>
            <span className="block text-[0.875rem] font-500">Parcelas iguais</span>
            <span className="block text-[0.8125rem] text-muted">
              {parcelas}× de {brl(Math.round(total / parcelas))}, sem entrada.
            </span>
          </span>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Campo rotulo="Início do contrato" htmlFor="inicio" obrigatorio>
          <input id="inicio" name="inicio" type="date" required defaultValue={hoje()} className="field" />
        </Campo>

        <Campo rotulo="Parcelas" htmlFor="parcelas">
          <input
            id="parcelas"
            name="parcelas"
            type="number"
            min={1}
            max={60}
            value={parcelas}
            onChange={(e) => setParcelas(Math.max(1, Number(e.target.value) || 1))}
            className="field tnum"
          />
        </Campo>

        <Campo rotulo="Intervalo (dias)" htmlFor="intervalo">
          <input
            id="intervalo"
            name="intervalo"
            type="number"
            min={1}
            max={180}
            value={intervalo}
            onChange={(e) => setIntervalo(Math.max(1, Number(e.target.value) || 30))}
            className="field tnum"
          />
        </Campo>
      </div>

      <p className="border-t border-line pt-4 text-[0.875rem] text-muted">
        Cronograma a criar: <strong className="font-500 text-ink">{parcelas} parcelas</strong>,
        primeira vencendo em{" "}
        {formatarCurto(hoje())} —{" "}
        {forma === "entrada" ? `entrada de ${brl(Math.round(total * 0.3))}` : `de ${brl(Math.round(total / parcelas))}`}.
      </p>

      <BotaoEnviar variante="primario">
        Fechar contrato e lançar parcelas
        <Icone nome="seta" tamanho={16} className="seta" />
      </BotaoEnviar>
    </form>
  );
}

function formatarCurto(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}