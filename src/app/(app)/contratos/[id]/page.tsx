import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirSecao } from "@/lib/exigir";

import { Icone } from "@/components/Icone";
import { FormStatus } from "@/components/FormStatus";
import { encerrarContrato, mudarStatusContrato } from "@/actions/comercial";
import { rotulosStatusContrato } from "@/db/schema";
import { detalheContrato } from "@/lib/consultas";
import { formatarData, hoje, prazoRelativo } from "@/lib/dates";
import { brl } from "@/lib/money";
import {
  CabecalhoPagina,
  Etiqueta,
  EtiquetaStatus,
  LinhaDado,
  Painel,
  Regua,
  Vazio,
} from "@/components/ui";
import { listarLancamentos } from "@/lib/consultas";
import { pluralizar } from "@/lib/utils";

export default async function PaginaContrato({ params }: { params: Promise<{ id: string }> }) {
  await exigirSecao("contratos");

  const { id } = await params;
  const dados = await detalheContrato(id);
  if (!dados) notFound();

  const { contrato: c, nomeCliente, cnpj } = dados;
  const parcelas = await listarLancamentos({ clienteId: c.clienteId });
  const doContrato = parcelas.filter((l) => l.contratoId === c.id);

  const recebido = doContrato
    .filter((l) => l.status === "pago")
    .reduce((a, l) => a + (l.valorRecebido || l.valor), 0);
  const emAberto = doContrato
    .filter((l) => l.status === "pendente" || l.status === "atrasado")
    .reduce((a, l) => a + l.valor, 0);
  const atrasado = doContrato
    .filter((l) => l.atrasado)
    .reduce((a, l) => a + l.valor, 0);

  const etapas = ["rascunho", "enviado", "assinado", "ativo", "suspenso", "encerrado"] as const;

  return (
    <div className="flex flex-col gap-7">
      <CabecalhoPagina
        eyebrow="Contrato"
        titulo={c.titulo}
        descricao={`${c.numero} · ${nomeCliente}${cnpj ? ` · ${cnpj}` : ""}`}
        acoes={
          <div className="flex flex-wrap gap-2">
            <EtiquetaStatus rotulo={rotulosStatusContrato[c.status]} />
            <Link href={`/doc/contrato/${c.id}`} className="btn btn-secundario" target="_blank">
              <Icone nome="imprimir" tamanho={15} />
              Ver documento
            </Link>
            <Link href={`/contratos/${c.id}/editar`} className="btn btn-secundario">
              <Icone nome="editar" tamanho={15} />
              Editar
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-4">
        <div className="border-t border-line pt-3">
          <p className="label">Valor total</p>
          <p className="mt-1 text-[1.5rem] leading-none font-500 tnum">{brl(c.valorTotal)}</p>
        </div>
        <div className="border-t border-line pt-3">
          <p className="label">Recebido</p>
          <p className="mt-1 text-[1.5rem] leading-none font-500 tnum text-ok">{brl(recebido)}</p>
        </div>
        <div className="border-t border-line pt-3">
          <p className="label">Em aberto</p>
          <p className="mt-1 text-[1.5rem] leading-none font-500 tnum">{brl(emAberto)}</p>
        </div>
        <div className="border-t border-line pt-3">
          <p className="label">Atrasado</p>
          <p
            className={`mt-1 text-[1.5rem] leading-none font-500 tnum ${atrasado > 0 ? "text-danger" : ""}`}
          >
            {brl(atrasado)}
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <Painel
          titulo="Parcelas"
          descricao={`${pluralizar(doContrato.length, "lançamento gerado", "lançamentos gerados")} pelo contrato.`}
          acoes={
            <Link
              href={`/financeiro?clienteId=${c.clienteId}`}
              className="text-[0.8125rem] text-accent hover:underline"
            >
              Ver financeiro
            </Link>
          }
        >
          {doContrato.length === 0 ? (
            <Vazio
              titulo="Nenhuma parcela lançada"
              texto="Gere o cronograma de cobrança para o contrato começar a contar."
            />
          ) : (
            <table className="tabela">
              <thead>
                <tr>
                  <th>Parcela</th>
                  <th>Vencimento</th>
                  <th>Situação</th>
                  <th className="num">Valor</th>
                </tr>
              </thead>
              <tbody>
                {doContrato.map((l) => (
                  <tr key={l.id}>
                    <td>{l.descricao}</td>
                    <td className="tnum">
                      <span className={l.atrasado ? "text-danger" : "text-muted"}>
                        {formatarData(l.vencimento)}
                      </span>
                    </td>
                    <td>
                      {l.status === "pago" ? (
                        <EtiquetaStatus rotulo="Pago" />
                      ) : l.atrasado ? (
                        <EtiquetaStatus rotulo="Atrasado" />
                      ) : l.status === "cancelado" ? (
                        <Etiqueta tom="mute">Cancelado</Etiqueta>
                      ) : (
                        <EtiquetaStatus rotulo="Pendente" />
                      )}
                    </td>
                    <td className="num">{brl(l.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Painel>

        <div className="flex flex-col gap-8">
          <Painel titulo="Dados do contrato">
            <div className="flex flex-col">
              <LinhaDado rotulo="Cliente" valor={nomeCliente} />
              {cnpj && <LinhaDado rotulo="CNPJ" valor={cnpj} />}
              <LinhaDado rotulo="Início" valor={formatarData(c.inicio)} />
              <LinhaDado
                rotulo="Fim"
                valor={
                  c.fim ? (
                    <>
                      {formatarData(c.fim)}{" "}
                      <span className="text-[0.8125rem] text-faint">
                        ({prazoRelativo(c.fim)})
                      </span>
                    </>
                  ) : (
                    "aberto"
                  )
                }
              />
              <LinhaDado
                rotulo="Parcelas"
                valor={`${c.parcelas}× a cada ${c.intervaloParcelasDias} dias`}
              />
              <LinhaDado rotulo="Pagamento" valor={c.formaPagamento ?? "—"} />
              {c.assinadoEm && (
                <LinhaDado rotulo="Assinado em" valor={formatarData(c.assinadoEm)} />
              )}
            </div>
          </Painel>

          <Painel titulo="Situação" descricao="O que muda o contrato de estado.">
            <div className="flex flex-wrap gap-2">
              {etapas.map((s) => (
                <FormStatus
                  key={s}
                  acao={mudarStatusContrato}
                  campos={{ id: c.id, status: s }}
                  rotulo={rotulosStatusContrato[s]}
                  ativo={c.status === s}
                />
              ))}
            </div>
          </Painel>

          {c.status !== "encerrado" && (
            <Painel titulo="Encerrar contrato" descricao="Cancela o que ainda está por receber.">
              <FormStatus
                acao={encerrarContrato}
                campos={{ id: c.id, motivo: "Encerrado pelo painel" }}
                rotulo="Encerrar contrato"
                variante="perigo"
              />
              <p className="mt-3 text-[0.8125rem] text-faint">
                Encerrar hoje ({formatarData(hoje())}) mantém o histórico e cancela as
                parcelas abertas.
              </p>
            </Painel>
          )}
        </div>
      </div>

      <Regua />
    </div>
  );
}
