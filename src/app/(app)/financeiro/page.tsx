import Link from "next/link";
import { exigirSecao } from "@/lib/exigir";

import { FormBaixa } from "@/components/forms/FormBaixa";
import { FormDespesa, FormLancamento } from "@/components/forms/FormFinanceiro";
import { Icone } from "@/components/Icone";
import { TabelaBaixas } from "@/components/TabelaBaixas";
import {
  anosComMovimento,
  listarLancamentos,
  listarContratos,
  opcoesClientes,
} from "@/lib/consultas";
import { resumoPeriodo } from "@/actions/financeiro";
import { rotulosFormaPagamento } from "@/db/schema";
import { formatarData, hoje } from "@/lib/dates";
import { brl } from "@/lib/money";
import { mascararDocumento, pluralizar } from "@/lib/utils";
import {
  CabecalhoPagina,
  Estatistica,
  Etiqueta,
  Painel,
  Vazio,
} from "@/components/ui";

export const metadata = { title: "Financeiro" };

const SITUACOES = [
  { v: "", r: "Tudo" },
  { v: "pendente", r: "Em aberto" },
  { v: "atrasado", r: "Atrasado" },
  { v: "pago", r: "Pago" },
  { v: "cancelado", r: "Cancelado" },
];

export default async function PaginaFinanceiro({
  searchParams,
}: {
  searchParams: Promise<{
    ano?: string;
    status?: string;
    clienteId?: string;
    novo?: string;
    baixa?: string;
    despesa?: string;
  }>;
}) {
  await exigirSecao("financeiro");

  const { ano, status, clienteId, novo, baixa, despesa } = await searchParams;

  const anos = await anosComMovimento();
  const anoAtivo = ano && anos.includes(Number(ano)) ? Number(ano) : anos[0];

  const [lancamentos, clientes, contratos, resumo] = await Promise.all([
    listarLancamentos({ ano, status, clienteId }),
    opcoesClientes(),
    listarContratos({ status: "todos" }),
    resumoPeriodo(`${anoAtivo}-01-01`, `${anoAtivo}-12-31`),
  ]);

  const emAberto = lancamentos.filter((l) => l.status === "pendente" || l.status === "atrasado");
  const atrasados = lancamentos.filter((l) => l.atrasado);
  const vencendo30 = emAberto.filter(
    (l) =>
      l.vencimento &&
      l.vencimento >= hoje() &&
      l.vencimento <= addDias(hoje(), 30),
  );

  const clienteFixo = clientes.find((c) => c.id === clienteId);
  const alvo = lancamentos.find((l) => l.id === baixa);

  return (
    <div className="flex flex-col gap-7">
      <CabecalhoPagina
        eyebrow="Caixa"
        titulo="Financeiro"
        descricao="O que entrou, o que não entrou, o que foi dado de desconto. Fechado por ano."
        acoes={
          <div className="flex flex-wrap gap-2">
            <Link href="/financeiro?novo=1" className="btn btn-secundario">
              <Icone nome="mais" tamanho={15} />
              Lançamento
            </Link>
            <Link href="/financeiro?despesa=1" className="btn btn-secundario">
              <Icone nome="financeiro" tamanho={15} />
              Despesa
            </Link>
          </div>
        }
      />

      {/* --- Fechamento do ano --- */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-5">
        <Estatistica
          rotulo={`Recebido em ${anoAtivo}`}
          valor={brl(resumo.recebido)}
          detalhe="Baixas efetivas"
        />
        <Estatistica
          rotulo="Descontos dados"
          valor={brl(resumo.descontos)}
          detalhe="Valor negativo no histórico"
          tom={resumo.descontos > 0 ? "warn" : undefined}
        />
        <Estatistica rotulo="Recebido líquido" valor={brl(resumo.liquido)} />
        <Estatistica rotulo="Despesas" valor={brl(resumo.despesas)} />
        <Estatistica
          rotulo="Resultado"
          valor={brl(resumo.resultado)}
          tom={resumo.resultado < 0 ? "danger" : resumo.resultado > 0 ? "ok" : undefined}
        />
      </div>

      {/* --- Situação da carteira --- */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-4">
        <Estatistica
          rotulo="Em aberto"
          valor={brl(emAberto.reduce((a, l) => a + l.valor, 0))}
          detalhe={`${pluralizar(emAberto.length, "lançamento", "lançamentos")}`}
        />
        <Estatistica
          rotulo="Atrasado"
          valor={brl(atrasados.reduce((a, l) => a + l.valor, 0))}
          detalhe={`${pluralizar(atrasados.length, "vencido", "vencidos")}`}
          tom={atrasados.length > 0 ? "danger" : undefined}
        />
        <Estatistica
          rotulo="Vence em 30 dias"
          valor={brl(vencendo30.reduce((a, l) => a + l.valor, 0))}
          detalhe={`${pluralizar(vencendo30.length, "cobrança", "cobranças")}`}
        />
        <Estatistica
          rotulo="Ano"
          valor={
            <span className="flex flex-wrap gap-1.5">
              {anos.map((a) => (
                <Link
                  key={a}
                  href={`/financeiro?ano=${a}`}
                  className={[
                    "rounded-full border px-2.5 py-1 text-[0.75rem] tnum transition-colors duration-150",
                    a === anoAtivo
                      ? "border-deep bg-deep text-on-deep"
                      : "border-line-strong text-muted hover:border-accent",
                  ].join(" ")}
                >
                  {a}
                </Link>
              ))}
            </span>
          }
        />
      </div>

      {/* --- Filtros --- */}
      <nav className="flex flex-wrap items-end gap-3 border-b border-line pb-4">
        <div className="flex flex-wrap gap-1.5">
          {SITUACOES.map((s) => {
            const ativo = (status ?? "") === s.v;
            return (
              <Link
                key={s.v || "tudo"}
                href={`/financeiro?${new URLSearchParams({ ...(ano ? { ano } : {}), ...(s.v ? { status: s.v } : {}), ...(clienteId ? { clienteId } : {}) })}`}
                className={[
                  "rounded-full border px-3 py-1.5 text-[0.75rem] transition-colors duration-150",
                  ativo
                    ? "border-deep bg-deep text-on-deep"
                    : "border-line-strong text-muted hover:border-accent hover:text-ink",
                ].join(" ")}
              >
                {s.r}
              </Link>
            );
          })}
        </div>

        {clienteFixo && (
          <Link
            href={`/financeiro?ano=${anoAtivo}`}
            className="text-[0.8125rem] text-accent hover:underline"
          >
            {clienteFixo.nome} ×
          </Link>
        )}
      </nav>

      {novo && (
        <Painel
          titulo="Novo lançamento"
          descricao="Cobrança avulsa. Se for parcela de contrato, use o contrato — o cronograma já gera."
        >
          <FormLancamento
            clientes={clientes}
            clienteFixo={clienteId}
            cliente={clienteFixo?.nome}
            contratos={contratos.map((c) => ({
              id: c.id,
              numero: c.numero,
              titulo: c.titulo,
            }))}
          />
        </Painel>
      )}

      {despesa && (
        <Painel titulo="Nova despesa" descricao="O que saiu para manter a operação.">
          <FormDespesa />
        </Painel>
      )}

      {alvo && (
        <Painel>
          <FormBaixa lancamento={alvo as never} />
        </Painel>
      )}

      {/* --- Lista --- */}
      {lancamentos.length === 0 ? (
        <Vazio
          titulo="Nada neste filtro"
          texto="Quando um contrato é assinado, as parcelas entram aqui automaticamente."
          acao={
            <Link href="/contratos" className="btn btn-primario">
              Ver contratos
            </Link>
          }
        />
      ) : (
        <TabelaBaixas lancamentos={lancamentos} mostrarBaixa={Boolean(baixa)} />
      )}

      <p className="max-w-[70ch] text-[0.8125rem] leading-relaxed text-faint">
        Desconto nunca apaga o valor cobrado: entra como movimentação negativa no
        histórico. Assim o sistema mostra o que foi faturado e o que entrou de
        verdade — os dois números, sem um esconder o outro.
      </p>
    </div>
  );
}

function addDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}