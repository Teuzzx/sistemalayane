import Link from "next/link";

import {
  anosComMovimento,
  documentosVencendo,
  funil,
  proximasContas,
  proximosPassos,
  resumoPainel,
  serieMensal,
  topClientes,
} from "@/lib/consultas";
import { formatarData, prazoRelativo } from "@/lib/dates";
import { brl, brlCompacto } from "@/lib/money";
import { requireUsuario } from "@/lib/auth";
import {
  CabecalhoPagina,
  Estatistica,
  Etiqueta,
  Painel,
  Regua,
  Vazio,
  tomDeVencimento,
} from "@/components/ui";
import { Barras, Funil } from "@/components/Graficos";

export const metadata = { title: "Painel" };

export default async function PaginaPainel({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string }>;
}) {
  const eu = await requireUsuario();
  const { ano: anoParam } = await searchParams;

  const anos = await anosComMovimento();
  const ano = anoParam && anos.includes(Number(anoParam)) ? Number(anoParam) : anos[0];

  const [resumo, serie, funilDados, contas, docs, passos, ranking] =
    await Promise.all([
      resumoPainel(ano),
      serieMensal(ano),
      funil(),
      proximasContas(),
      documentosVencendo(),
      proximosPassos(),
      topClientes(ano),
    ]);

  const hora = new Date().getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";

  const temDados =
    resumo.faturamento > 0 || resumo.clientesAtivos > 0 || resumo.aReceber > 0;

  return (
    <div className="flex flex-col gap-8">
      <CabecalhoPagina
        eyebrow={`${saudacao}, ${eu.nome.split(" ")[0]}`}
        titulo="Painel"
        descricao="A situação da carteira hoje: o que entrou, o que falta entrar, o que está vencendo e o que está em movimento."
        acoes={
          <div className="flex items-center gap-1.5">
            {anos.map((a) => (
              <Link
                key={a}
                href={`/painel?ano=${a}`}
                className={[
                  "rounded-full border px-3 py-1.5 text-[0.75rem] tnum transition-colors duration-150",
                  a === ano
                    ? "border-deep bg-deep text-on-deep"
                    : "border-line-strong text-muted hover:border-accent hover:text-ink",
                ].join(" ")}
              >
                {a}
              </Link>
            ))}
          </div>
        }
      />

      {!temDados && <PrimeiroUso />}

      {/* --- Números grandes --- */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-3 xl:grid-cols-6">
        <Estatistica
          rotulo={`Faturamento ${ano}`}
          valor={brlCompacto(resumo.faturamento)}
          detalhe="Recebido no período"
          tom={resumo.faturamento > 0 ? undefined : "mute"}
          href="/financeiro"
        />
        <Estatistica
          rotulo="A receber"
          valor={brlCompacto(resumo.aReceber)}
          detalhe={`${resumo.aReceberCount} lançamento(s)`}
          href="/financeiro"
        />
        <Estatistica
          rotulo="Em atraso"
          valor={brlCompacto(resumo.atrasado)}
          detalhe={`${resumo.atrasadoCount} vencidos`}
          tom={resumo.atrasado > 0 ? "danger" : undefined}
          href="/financeiro?status=atrasado"
        />
        <Estatistica
          rotulo="Próximos 30 dias"
          valor={brlCompacto(resumo.proximos)}
          detalhe={`${resumo.proximosCount} a vencer`}
          href="/financeiro"
        />
        <Estatistica
          rotulo="Clientes ativos"
          valor={resumo.clientesAtivos}
          detalhe={`${resumo.potenciais} em carteira`}
          href="/clientes"
        />
        <Estatistica
          rotulo="Vencendo (docs)"
          valor={resumo.docsVencendo}
          detalhe="Licenças e certidões"
          tom={resumo.docsVencendo > 0 ? "warn" : undefined}
          href="/documentos"
        />
      </div>

      {/* --- Gráfico + funil --- */}
      <div className="grid gap-8 xl:grid-cols-[1.4fr_1fr]">
        <Painel
          titulo={`Faturamento recebido mês a mês · ${ano}`}
          descricao="Considera apenas o que foi de fato recebido."
        >
          <Barras dados={serie} />
        </Painel>

        <Painel
          titulo="Funil de demandas"
          descricao="Onde cada cliente está na jornada."
          acoes={
            <Link href="/demandas" className="text-[0.8125rem] text-accent hover:underline">
              Ver todas
            </Link>
          }
        >
          <Funil etapas={funilDados} />
        </Painel>
      </div>

      {/* --- Listas de trabalho --- */}
      <div className="grid gap-8 lg:grid-cols-2">
        <Painel
          titulo="Próximas contas"
          descricao="O que precisa ser cobrado."
          acoes={
            <Link href="/financeiro" className="text-[0.8125rem] text-accent hover:underline">
              Financeiro
            </Link>
          }
        >
          {contas.length === 0 ? (
            <Vazio titulo="Nada a cobrar" texto="Nenhuma conta em aberto." />
          ) : (
            <table className="tabela tabela-compacta">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Vencimento</th>
                  <th className="num">Valor</th>
                </tr>
              </thead>
              <tbody>
                {contas.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link
                        href={`/clientes/${c.clienteId}`}
                        className="hover:text-accent"
                      >
                        {c.cliente}
                      </Link>
                      <p className="text-[0.8125rem] text-faint">{c.descricao}</p>
                    </td>
                    <td>
                      <span
                        className={
                          c.vencimento && c.vencimento < new Date().toISOString().slice(0, 10)
                            ? "text-danger"
                            : "text-muted"
                        }
                      >
                        {formatarData(c.vencimento)}
                      </span>
                      <p className="text-[0.8125rem] text-faint">
                        {prazoRelativo(c.vencimento)}
                      </p>
                    </td>
                    <td className="num">{brl(c.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Painel>

        <Painel
          titulo="Documentos a vencer"
          descricao="Licenças, autorizações e certidões com prazo no fim."
          acoes={
            <Link href="/documentos" className="text-[0.8125rem] text-accent hover:underline">
              Vencimentos
            </Link>
          }
        >
          {docs.length === 0 ? (
            <Vazio titulo="Nenhum documento vencendo" texto="Nada nos próximos 60 dias." />
          ) : (
            <ul>
              {docs.map((d) => {
                const dias = d.validade
                  ? Math.round(
                      (new Date(d.validade).getTime() - Date.now()) / 86_400_000,
                    )
                  : null;
                return (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/clientes/${d.clienteId}`}
                        className="block truncate text-[0.9375rem] hover:text-accent"
                      >
                        {d.nome}
                      </Link>
                      <p className="text-[0.8125rem] text-faint">
                        {d.cliente}
                        {d.tipo ? ` · ${d.tipo}` : ""}
                      </p>
                    </div>
                    <Etiqueta tom={tomDeVencimento(dias ?? 999)}>
                      {prazoRelativo(d.validade)}
                    </Etiqueta>
                  </li>
                );
              })}
            </ul>
          )}
        </Painel>
      </div>

      {/* --- Compromissos + ranking --- */}
      <div className="grid gap-8 lg:grid-cols-2">
        <Painel titulo="Próximos passos combinados" descricao="O que ficou de combinado.">
          {passos.length === 0 ? (
            <Vazio
              titulo="Nada combinado"
              texto="Registre um próximo passo ao atender e ele aparece aqui."
            />
          ) : (
            <ul>
              {passos.map((p) => (
                <li
                  key={p.id}
                  className="flex items-start justify-between gap-3 border-b border-line py-2.5 last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="text-[0.9375rem]">{p.proximoPasso}</p>
                    <p className="text-[0.8125rem] text-faint">
                      <Link href={`/clientes/${p.clienteId}`} className="hover:text-accent">
                        {p.cliente}
                      </Link>
                    </p>
                  </div>
                  <span className="shrink-0 text-[0.8125rem] text-muted tnum">
                    {formatarData(p.dataProximoPasso)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Painel>

        <Painel
          titulo={`Quem mais pagou em ${ano}`}
          descricao="Concentração de receita por cliente."
        >
          {ranking.length === 0 ? (
            <Vazio titulo="Sem recebimentos no ano" />
          ) : (
            <ul>
              {ranking.map((c, i) => {
                const maior =
                  Number(ranking.reduce((a, b) => (Number(b.total ?? 0) > Number(a.total ?? 0) ? b : a), ranking[0]).total ?? 0) || 1;
                return (
                  <li
                    key={c.clienteId}
                    className="flex items-center gap-3 border-b border-line py-2.5 last:border-b-0"
                  >
                    <span className="index-num w-6 shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/clientes/${c.clienteId}`}
                        className="block truncate text-[0.9375rem] hover:text-accent"
                      >
                        {c.nome}
                      </Link>
                      <span className="mt-1 block h-1 bg-surface-2">
                        <span
                          className="block h-full bg-accent"
                          style={{
                            width: `${Math.min(100, Math.round((Number(c.total ?? 0) / maior) * 100))}%`,
                          }}
                        />
                      </span>
                    </div>
                    <span className="shrink-0 text-[0.9375rem] font-500 tnum">
                      {brlCompacto(Number(c.total ?? 0))}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Painel>
      </div>

      <Regua />
    </div>
  );
}

/* Primeira tela vazia — o sistema precisa se explicar sozinho. */
function PrimeiroUso() {
  return (
    <div className="border border-line-strong bg-surface px-5 py-6">
      <p className="label mb-2">Começando</p>
      <p className="max-w-[70ch] text-[0.9375rem] leading-relaxed text-muted">
        O sistema está vazio — nenhum cliente, nenhuma demanda, nenhum
        lançamento. O primeiro cadastro é sempre o mesmo:{" "}
        <strong className="font-600 text-ink">
          <Link href="/clientes/novo" className="text-accent hover:underline">
            cadastre o cliente
          </Link>
        </strong>{" "}
        e registre a primeira consulta. A partir daí, o histórico, o funil e
        o financeiro se preenchem sozinhos.
      </p>
    </div>
  );
}