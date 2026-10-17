import Link from "next/link";

import { requireUsuario } from "@/lib/auth";
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
import { diasAte, formatarData, prazoRelativo } from "@/lib/dates";
import { brl, brlCompacto } from "@/lib/money";
import { BarraSituacao, Barras, Funil } from "@/components/Graficos";
import { Icone } from "@/components/Icone";
import {
  CabecalhoPagina,
  Estatistica,
  Etiqueta,
  Painel,
  Pilula,
  Regua,
  Vazio,
  tomDeVencimento,
} from "@/components/ui";

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
  const primeiroNome = eu.nome.split(" ")[0];

  const temDados =
    resumo.faturamento > 0 ||
    resumo.clientesAtivos > 0 ||
    resumo.aReceber > 0;

  const emAberto = Math.max(resumo.aReceber - resumo.atrasado - resumo.proximos, 0);

  return (
    <div className="flex flex-col gap-6">
      <CabecalhoPagina
        titulo={`${saudacao}, ${primeiroNome}`}
        descricao="A situação da carteira hoje: o que entrou, o que falta entrar, o que está vencendo e o que está em movimento."
        acoes={
          <div className="flex items-center gap-1.5">
            {anos.map((a) => (
              <Link key={a} href={`/painel?ano=${a}`}>
                <Pilula ativo={a === ano}>{a}</Pilula>
              </Link>
            ))}
          </div>
        }
      />

      {!temDados && <PrimeiroUso />}

      {/* ---------- HERÓI: a receita do ano ---------- */}
      <div className="grid items-start gap-4 xl:grid-cols-[1.55fr_1fr]">
        <Painel
          className="animar"
          titulo={`Receita recebida em ${ano}`}
          descricao="Somente o que entrou de fato — não o que foi cobrado."
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <p className="text-[2.75rem] leading-none font-500 tracking-[-0.018em] tnum">
              {brl(resumo.faturamento)}
            </p>

            <dl className="flex flex-wrap gap-x-6 gap-y-2">
              <Item
                rotulo="Descontos"
                valor={brl(resumo.descontos)}
                tom={resumo.descontos > 0 ? "warn" : undefined}
              />
              <Item rotulo="Despesas" valor={brl(resumo.despesas)} />
              <Item
                rotulo="Resultado"
                valor={brl(resumo.liquido)}
                tom={resumo.liquido < 0 ? "danger" : "ok"}
              />
            </dl>
          </div>

          <div className="mt-6">
            <Barras dados={serie} />
          </div>
        </Painel>

        {/* ---------- Posição de caixa ---------- */}
        <Painel
          className="animar"
          titulo="Posição de caixa"
          descricao="Tudo que está a receber, por urgência."
        >
          <div className="flex items-end justify-between gap-4">
            <p className="text-[2rem] leading-none font-500 tracking-[-0.014em] tnum">
              {brl(resumo.aReceber)}
            </p>
            <Etiqueta tom={resumo.atrasado > 0 ? "danger" : "ok"}>
              {resumo.atrasado > 0
                ? `${resumo.atrasadoCount} em atraso`
                : "Em dia"}
            </Etiqueta>
          </div>

          <div className="mt-5">
            <BarraSituacao
              atrasado={resumo.atrasado}
              proximos={resumo.proximos}
              depois={emAberto}
            />
          </div>

          <Link
            href="/financeiro"
            className="mt-5 inline-flex items-center gap-1.5 text-[0.8125rem] text-accent transition-colors duration-150 hover:text-[var(--color-accent-vivo)]"
          >
            Abrir o financeiro
            <Icone nome="seta" tamanho={14} className="seta" />
          </Link>
        </Painel>
      </div>

      {/* ---------- Números de operação ---------- */}
      <div className="grupo grid grid-cols-2 gap-4 md:grid-cols-4">
        <Estatistica
          rotulo="Clientes ativos"
          valor={resumo.clientesAtivos}
          detalhe={`${resumo.potenciais} potenciais na carteira`}
          href="/clientes"
        />
        <Estatistica
          rotulo="Contratos em vigor"
          valor={resumo.contratosAtivos}
          detalhe="assinados ou ativos"
          href="/contratos"
        />
        <Estatistica
          rotulo="Documentos a vencer"
          valor={resumo.docsVencendo}
          detalhe="licenças e certidões"
          tom={resumo.docsVencendo > 0 ? "warn" : undefined}
          href="/documentos"
        />
        <Estatistica
          rotulo="Atendimentos no mês"
          valor={resumo.atendimentosMes}
          detalhe="registros neste mês"
        />
      </div>

      {/* ---------- Filas de trabalho ---------- */}
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Painel
          titulo="Próximas contas"
          descricao="O que precisa ser cobrado."
          acoes={<VerMais href="/financeiro" rotulo="Financeiro" />}
        >
          {contas.length === 0 ? (
            <Vazio titulo="Nada a cobrar" texto="Nenhuma conta em aberto." />
          ) : (
            <ul>
              {contas.map((c) => {
                const venceu = c.vencimento && c.vencimento < hojeIso();
                return (
                  <li
                    key={c.id}
                    className="flex items-center gap-3 border-b border-line py-2.5 last:border-b-0"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/clientes/${c.clienteId}`}
                        className="block truncate text-[0.9375rem] transition-colors duration-150 hover:text-accent"
                      >
                        {c.cliente}
                      </Link>
                      <p className="truncate text-[0.8125rem] text-faint">
                        {c.descricao}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={`text-[0.8125rem] tnum ${venceu ? "text-danger" : "text-muted"}`}
                      >
                        {prazoRelativo(c.vencimento)}
                      </p>
                      <p className="text-[0.9375rem] font-500 tnum">{brl(c.valor)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Painel>

        <Painel
          titulo="Documentos a vencer"
          descricao="Licenças, autorizações e certidões com prazo no fim."
          acoes={<VerMais href="/documentos" rotulo="Vencimentos" />}
        >
          {docs.length === 0 ? (
            <Vazio titulo="Nenhum documento vencendo" texto="Nada nos próximos 60 dias." />
          ) : (
            <ul>
              {docs.map((d) => {
                const dias = diasAte(d.validade);
                return (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-b-0"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/clientes/${d.clienteId}`}
                        className="block truncate text-[0.9375rem] transition-colors duration-150 hover:text-accent"
                      >
                        {d.nome}
                      </Link>
                      <p className="truncate text-[0.8125rem] text-faint">
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

      <div className="grid items-start gap-4 lg:grid-cols-2">
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
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.9375rem] leading-snug">{p.proximoPasso}</p>
                    <p className="text-[0.8125rem] text-faint">
                      <Link
                        href={`/clientes/${p.clienteId}`}
                        className="hover:text-accent"
                      >
                        {p.cliente}
                      </Link>
                    </p>
                  </div>
                  <span className="shrink-0 text-[0.8125rem] tnum text-muted">
                    {formatarData(p.dataProximoPasso)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Painel>

        <Painel
          titulo="Funil de demandas"
          descricao="Onde cada cliente está na jornada."
          acoes={<VerMais href="/demandas" rotulo="Ver todas" />}
        >
          <Funil etapas={funilDados} />
        </Painel>
      </div>

      {ranking.length > 0 && (
        <Painel
          titulo={`Quem mais pagou em ${ano}`}
          descricao="Concentração de receita por cliente."
        >
          <ul>
            {ranking.map((c, i) => {
              const maior =
                Number(
                  ranking.reduce(
                    (a, b) => (Number(b.total ?? 0) > Number(a.total ?? 0) ? b : a),
                    ranking[0],
                  ).total ?? 0,
                ) || 1;

              return (
                <li
                  key={c.clienteId}
                  className="flex items-center gap-3 border-b border-line py-2.5 last:border-b-0"
                >
                  <span className="w-6 shrink-0 text-[0.75rem] tnum text-[var(--color-tinta-4)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/clientes/${c.clienteId}`}
                      className="block truncate text-[0.9375rem] transition-colors duration-150 hover:text-accent"
                    >
                      {c.nome}
                    </Link>
                    <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-[rgba(244,241,232,0.07)]">
                      <span
                        className="block h-full rounded-full bg-[var(--color-accent)]"
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
        </Painel>
      )}

      <Regua />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Item({
  rotulo,
  valor,
  tom,
}: {
  rotulo: string;
  valor: string;
  tom?: "warn" | "danger" | "ok";
}) {
  return (
    <div>
      <dt className="label">{rotulo}</dt>
      <dd
        className={`mt-1 text-[0.9375rem] font-500 tnum ${
          tom === "warn" ? "text-warn" : tom === "danger" ? "text-danger" : tom === "ok" ? "text-ok" : ""
        }`}
      >
        {valor}
      </dd>
    </div>
  );
}

function VerMais({ href, rotulo }: { href: string; rotulo: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-[0.8125rem] text-accent transition-colors duration-150 hover:text-[var(--color-accent-vivo)]"
    >
      {rotulo}
      <Icone nome="seta" tamanho={13} className="seta" />
    </Link>
  );
}

function hojeIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/* Primeira tela vazia — o sistema precisa se explicar sozinho. */
function PrimeiroUso() {
  return (
    <div className="painel animar p-5">
      <p className="text-[0.9375rem] leading-relaxed text-muted">
        O sistema está vazio — nenhum cliente, nenhuma demanda, nenhum
        lançamento. O primeiro cadastro é sempre o mesmo:{" "}
        <Link
          href="/clientes/novo"
          className="font-600 text-accent underline decoration-accent/40 underline-offset-4 transition-colors duration-150 hover:text-[var(--color-accent-vivo)]"
        >
          cadastre o cliente
        </Link>{" "}
        e registre a primeira consulta. A partir daí, o histórico, o funil e
        o financeiro se preenchem sozinhos.
      </p>
    </div>
  );
}