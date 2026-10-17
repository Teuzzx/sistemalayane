/**
 * Gráficos — SVG inline, sem biblioteca.
 *
 * Um ano são 12 barras. O gráfico existe para mostrar a FORMA do ano
 * (meses fracos, meses cheios); o número exato mora no topo do painel.
 */

import { hoje } from "@/lib/dates";
import { brlCompacto } from "@/lib/money";

type Ponto = { mes: string; rotulo: string; valor: number };

export function Barras({
  dados,
  altura = 150,
}: {
  dados: Ponto[];
  altura?: number;
}) {
  const maximo = Math.max(...dados.map((d) => d.valor), 1);
  /* `hoje()` (fuso do Brasil) e não `toISOString()` (UTC): na virada do mês o
     UTC já está no mês seguinte, e a barra destacada seria a errada. */
  const mesAtual = hoje().slice(0, 7);

  /* ViewBox em PIXELS, não em unidade de viewBox: com `width: 100%` e
     altura automática, um viewBox de 100×174 esticava a altura do painel
     para mais de 1000px. Aqui a razão é fixa e a barra escala junto. */
  const LARGURA = 620;
  const MARGEM = 8;
  const passo = (LARGURA - MARGEM * 2) / dados.length;
  const largura = Math.max(3, passo * 0.46);

  const maior = dados.reduce(
    (a, b) => (b.valor > a.valor ? b : a),
    dados[0] ?? { rotulo: "—", valor: 0 },
  );

  return (
    <svg
      viewBox={`0 0 ${LARGURA} ${altura + 20}`}
      className="block w-full"
      style={{ aspectRatio: `${LARGURA} / ${altura + 20}` }}
      role="img"
      aria-label={`Faturamento recebido mês a mês. Maior mês: ${maior.rotulo}, ${brlCompacto(maior.valor)}.`}
    >
      {/* Linha de base — o eixo, em fio. */}
      <line
        x1={MARGEM}
        y1={altura}
        x2={LARGURA - MARGEM}
        y2={altura}
        stroke="currentColor"
        className="text-[var(--vidro-fio)]"
        strokeWidth="1"
      />

      {dados.map((d, i) => {
        const h = (d.valor / maximo) * altura;
        const x = MARGEM + i * passo + (passo - largura) / 2;
        const y = altura - h;
        const vazio = d.valor === 0;
        const ehAgora = d.mes === mesAtual;
        const ehMaior = d.mes === maior.mes && d.valor > 0;

        return (
          <g key={d.mes}>
            <rect
              x={x}
              y={vazio ? altura - 2 : y}
              width={largura}
              height={vazio ? 2 : Math.max(h, 1.5)}
              rx={2}
              className={
                vazio
                  ? "fill-[rgba(244,241,232,0.16)]"
                  : ehMaior
                    ? "fill-[var(--color-accent-vivo)]"
                    : ehAgora
                      ? "fill-[var(--color-accent)]"
                      : "fill-[rgba(125,148,97,0.62)]"
              }
            >
              <title>{`${d.rotulo}: ${brlCompacto(d.valor)}`}</title>
            </rect>

            <text
              x={x + largura / 2}
              y={altura + 14}
              textAnchor="middle"
              className={
                ehAgora
                  ? "fill-[var(--color-tinta)]"
                  : "fill-[var(--color-tinta-4)]"
              }
              fontSize={10}
              fontWeight={ehAgora ? 600 : 400}
            >
              {d.rotulo.slice(0, 3)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/**
 * Funil de demandas — contagem por etapa, em linha com barra proporcional.
 * A sequência carrega informação (é o funil), então o número de ordem
 * fica; a barra, não.
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
          className="group flex items-center gap-3 border-b border-line py-2.5 last:border-b-0"
        >
          <span className="w-6 shrink-0 text-[0.75rem] tnum text-[var(--color-tinta-4)]">
            {String(i + 1).padStart(2, "0")}
          </span>
          <span className="w-28 shrink-0 text-[0.8125rem]">{e.rotulo}</span>
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[rgba(244,241,232,0.07)]">
            <span
              className="block h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-500"
              style={{ width: `${Math.round((e.n / max) * 100)}%` }}
            />
          </span>
          <span className="w-7 shrink-0 text-right text-[0.875rem] font-500 tnum">
            {e.n}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Posição de caixa — uma barra empilhada mostra a composição do que está
 * em aberto. Mais rápido de ler que três números soltos: o olho vê a
 * fatia vermelha antes de ler qualquer dígito.
 */
export function BarraSituacao({
  atrasado,
  proximos,
  depois,
}: {
  atrasado: number;
  proximos: number;
  depois: number;
}) {
  const total = Math.max(atrasado + proximos + depois, 1);
  const fatias = [
    { v: atrasado, classe: "bg-[var(--color-perigo)]", nome: "Atrasado" },
    { v: proximos, classe: "bg-[var(--color-warn)]", nome: "Próximos 30 dias" },
    { v: depois, classe: "bg-[rgba(125,148,97,0.55)]", nome: "Depois" },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-2 gap-[3px] overflow-hidden rounded-full">
        {fatias.map((f) =>
          f.v > 0 ? (
            <span
              key={f.nome}
              className={`${f.classe} h-full first:rounded-l-full last:rounded-r-full`}
              style={{ width: `${(f.v / total) * 100}%` }}
            />
          ) : null,
        )}
      </div>

      <ul className="flex flex-col gap-1.5">
        {fatias.map((f) => (
          <li key={f.nome} className="flex items-center gap-2.5 text-[0.8125rem]">
            <span className={`size-2 shrink-0 rounded-full ${f.classe}`} />
            <span className="flex-1 text-muted">{f.nome}</span>
            <span className="tnum">{brlCompacto(f.v)}</span>
            <span className="w-9 text-right tnum text-[var(--color-tinta-4)]">
              {Math.round((f.v / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}