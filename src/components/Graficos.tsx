/**
 * Gráfico de barras — faturamento mês a mês.
 *
 * SVG inline, sem biblioteca. Um ano é 12 barras; o gráfico existe para
 * mostrar a FORMA do ano (meses fracos, meses cheios), não para ser
 * preciso — o número exato está no rótulo de cima e na tabela ao lado.
 */

import { brlCompacto } from "@/lib/money";

type Ponto = { mes: string; rotulo: string; valor: number };

export function Barras({
  dados,
  altura = 132,
}: {
  dados: Ponto[];
  altura?: number;
}) {
  const maximo = Math.max(...dados.map((d) => d.valor), 1);
  const hojeMes = new Date().toISOString().slice(0, 7);

  const L = 8; // espaço das barras nas bordas
  const larguraTotal = 100; // em %, o SVG escala pelo viewBox
  const passo = (larguraTotal - L * 2) / dados.length;
  const largura = Math.max(1.4, passo * 0.52);

  return (
    <div className="flex flex-col gap-3">
      <svg
        viewBox={`0 0 ${larguraTotal} ${altura + 16}`}
        className="w-full overflow-visible"
        role="img"
        aria-label="Faturamento recebido mês a mês"
      >
        {dados.map((d, i) => {
          const h = (d.valor / maximo) * altura;
          const x = L + i * passo + (passo - largura) / 2;
          const y = altura - h;
          const mesAtual = d.mes === hojeMes;
          const vazio = d.valor === 0;

          return (
            <g key={d.mes}>
              {/* Cilindro simples; o valor mora no title, o olho pega a forma. */}
              <rect
                x={x}
                y={vazio ? altura - 1 : y}
                width={largura}
                height={vazio ? 1 : Math.max(h, 1.5)}
                rx={0.6}
                className={vazio ? "fill-line-strong" : "fill-accent"}
                opacity={vazio ? 0.6 : mesAtual ? 1 : 0.82}
              >
                <title>{`${d.rotulo}: ${brlCompacto(d.valor)}`}</title>
              </rect>

              {mesAtual && !vazio && (
                <rect
                  x={x}
                  y={y - 1.5}
                  width={largura}
                  height={1.5}
                  rx={0.6}
                  className="fill-deep"
                />
              )}

              <text
                x={x + largura / 2}
                y={altura + 9}
                textAnchor="middle"
                className="fill-faint"
                style={{ fontSize: 2.1, fontVariantNumeric: "tabular-nums" }}
              >
                {d.rotulo.slice(0, 3)}
              </text>
            </g>
          );
        })}
      </svg>

      <p className="label">
        Maior mês:{" "}
        <span className="tnum text-ink">
          {dados.reduce((a, b) => (b.valor > a.valor ? b : a), dados[0] ?? {
            rotulo: "—",
            valor: 0,
          }).rotulo}{" "}
          · {brlCompacto(Math.max(...dados.map((d) => d.valor), 0))}
        </span>
      </p>
    </div>
  );
}

/**
 * Funil de demandas — contagem por etapa, em linha com fio.
 * Largura proporcional, nunca boleto colorido.
 */
export function Funil({
  etapas,
}: {
  etapas: { rotulo: string; n: number; valor: number }[];
}) {
  const max = Math.max(...etapas.map((e) => e.n), 1);
  const comMovimento = etapas.filter((e) => e.n > 0);

  if (comMovimento.length === 0) {
    return (
      <p className="py-2 text-[0.875rem] text-muted">
        Nenhuma demanda em andamento no funil.
      </p>
    );
  }

  return (
    <ul className="flex flex-col">
      {etapas.map((e, i) => (
        <li
          key={e.rotulo}
          className="flex items-center gap-3 border-b border-line py-2 last:border-b-0"
        >
          <span className="index-num w-6 shrink-0">{String(i + 1).padStart(2, "0")}</span>
          <span className="w-28 shrink-0 text-[0.8125rem]">{e.rotulo}</span>
          <span className="h-1.5 flex-1 bg-surface-2">
            <span
              className="block h-full bg-accent"
              style={{ width: `${Math.round((e.n / max) * 100)}%` }}
            />
          </span>
          <span className="w-8 shrink-0 text-right text-[0.8125rem] font-500 tnum">
            {e.n}
          </span>
        </li>
      ))}
    </ul>
  );
}