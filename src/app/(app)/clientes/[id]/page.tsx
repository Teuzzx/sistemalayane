import Link from "next/link";
import { notFound } from "next/navigation";

import {
  arquivarCliente,
  mudarStatusCliente,
  restaurarCliente,
} from "@/actions/clientes";
import { Icone } from "@/components/Icone";
import { FormAtendimento } from "@/components/forms/FormAtendimento";
import { TabelaFinanceiroCliente } from "@/components/TabelaFinanceiro";
import {
  rotulosFormaPagamento,
  rotulosStatusCliente,
  rotulosStatusContrato,
  rotulosStatusDemanda,
  rotulosStatusOrcamento,
  rotulosTipoAtendimento,
  type Cliente,
} from "@/db/schema";
import { detalheCliente } from "@/lib/consultas";
import { diasAte, formatarData, prazoRelativo } from "@/lib/dates";
import { brl } from "@/lib/money";
import {
  mascararDocumento,
  mascararTelefone,
} from "@/lib/utils";
import {
  CabecalhoPagina,
  Etiqueta,
  EtiquetaStatus,
  LinhaDado,
  Painel,
  Regua,
  Vazio,
  tomDeVencimento,
} from "@/components/ui";

const ABAS = [
  { id: "resumo", r: "Resumo" },
  { id: "historico", r: "Histórico" },
  { id: "demandas", r: "Demandas" },
  { id: "financeiro", r: "Financeiro" },
  { id: "documentos", r: "Documentos" },
  { id: "contratos", r: "Contratos e orçamentos" },
] as const;

export default async function PaginaCliente({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aba?: string }>;
}) {
  const { id } = await params;
  const { aba } = await searchParams;

  const dados = await detalheCliente(id);
  if (!dados) notFound();

  const { cliente, resumo } = dados;
  const ativa = ABAS.some((a) => a.id === aba) ? aba! : "resumo";

  return (
    <div className="flex flex-col gap-7">
      <CabecalhoPagina
        eyebrow={
          [cliente.segmento, cliente.cidade && [cliente.cidade, cliente.uf].filter(Boolean).join("/")]
            .filter(Boolean)
            .join(" · ") || "Carteira"
        }
        titulo={cliente.nome}
        descricao={
          cliente.nomeFantasia && cliente.nomeFantasia !== cliente.nome
            ? cliente.nomeFantasia
            : cliente.contatoNome
              ? `Contato: ${cliente.contatoNome}${cliente.contatoCargo ? ` — ${cliente.contatoCargo}` : ""}`
              : undefined
        }
        acoes={
          <div className="flex flex-wrap gap-2">
            <EtiquetaStatus rotulo={rotulosStatusCliente[cliente.status]} />
            <Link href={`/clientes/${cliente.id}/editar`} className="btn btn-secundario">
              <Icone nome="editar" tamanho={15} />
              Editar
            </Link>
            <Link href="#atendimento" className="btn btn-primario">
              <Icone nome="mais" tamanho={16} />
              Registrar atendimento
            </Link>
          </div>
        }
      />

      {/* --- Números do cliente --- */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
        <Numero
          rotulo="Recebido"
          valor={brl(resumo.recebido)}
          detalhe={resumo.recebido > 0 ? undefined : "Nada recebido ainda"}
        />
        <Numero rotulo="A receber" valor={brl(resumo.aReceber)} />
        <Numero
          rotulo="Em atraso"
          valor={brl(resumo.atrasado)}
          tom={resumo.atrasado > 0 ? "danger" : undefined}
        />
        <Numero
          rotulo="Demandas abertas"
          valor={resumo.demandasAbertas}
          detalhe={resumo.proximoContato ? `Próximo contato ${prazoRelativo(resumo.proximoContato)}` : undefined}
        />
      </div>

      {/* --- Abas --- */}
      <nav className="flex flex-wrap gap-1 border-b border-line">
        {ABAS.map((a) => {
          const ativaAgora = ativa === a.id;
          const contagem =
            a.id === "historico" ? dados.historico.length
            : a.id === "demandas" ? dados.demandas.length
            : a.id === "financeiro" ? dados.lancamentos.length
            : a.id === "documentos" ? dados.documentos.length
            : a.id === "contratos" ? dados.contratos.length + dados.orcamentos.length
            : 0;

          return (
            <Link
              key={a.id}
              href={`/clientes/${cliente.id}?aba=${a.id}`}
              aria-current={ativaAgora ? "page" : undefined}
              className={[
                "-mb-px border-b-2 px-3.5 py-2.5 text-[0.8125rem] transition-colors duration-150",
                ativaAgora
                  ? "border-deep text-ink"
                  : "border-transparent text-muted hover:border-line-strong hover:text-ink",
              ].join(" ")}
            >
              {a.r}
              {contagem > 0 && <span className="ml-1.5 text-faint tnum">{contagem}</span>}
            </Link>
          );
        })}
      </nav>

      {/* --- Conteúdo --- */}
      {ativa === "resumo" && <AbaResumo dados={dados} />}
      {ativa === "historico" && (
        <AbaHistorico
          historico={dados.historico}
          clienteId={cliente.id}
          demandas={dados.demandas}
        />
      )}
      {ativa === "demandas" && <AbaDemandas demandas={dados.demandas} clienteId={cliente.id} />}
      {ativa === "financeiro" && (
        <TabelaFinanceiroCliente
          lancamentos={dados.lancamentos}
          clienteId={cliente.id}
        />
      )}
      {ativa === "documentos" && (
        <AbaDocumentos documentos={dados.documentos} clienteId={cliente.id} />
      )}
      {ativa === "contratos" && (
        <div className="flex flex-col gap-8">
          <Painel
            titulo="Contratos"
            descricao="O que está assinado com este cliente."
            acoes={
              <Link
                href={`/contratos/novo?clienteId=${cliente.id}`}
                className="btn btn-secundario"
              >
                <Icone nome="mais" tamanho={15} />
                Novo contrato
              </Link>
            }
          >
            {dados.contratos.length === 0 ? (
              <Vazio
                titulo="Nenhum contrato"
                texto="Quando fechar seis meses de acompanhamento, o contrato é registrado aqui."
                acao={
                  <Link
                    href={`/contratos/novo?clienteId=${cliente.id}`}
                    className="btn btn-primario"
                  >
                    Montar contrato
                  </Link>
                }
              />
            ) : (
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Título</th>
                    <th>Situação</th>
                    <th>Vigência</th>
                    <th className="num">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.contratos.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <Link href={`/contratos/${c.id}`} className="tnum hover:text-accent">
                          {c.numero}
                        </Link>
                      </td>
                      <td>{c.titulo}</td>
                      <td>
                        <EtiquetaStatus rotulo={rotulosStatusContrato[c.status]} />
                      </td>
                      <td className="tnum text-muted">
                        {formatarData(c.inicio)} — {c.fim ? formatarData(c.fim) : "aberto"}
                      </td>
                      <td className="num">{brl(c.valorTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Painel>

          <Painel
            titulo="Orçamentos"
            descricao="Propostas enviadas e o que foi aprovado."
            acoes={
              <Link
                href={`/orcamentos/novo?clienteId=${cliente.id}`}
                className="btn btn-secundario"
              >
                <Icone nome="mais" tamanho={15} />
                Novo orçamento
              </Link>
            }
          >
            {dados.orcamentos.length === 0 ? (
              <Vazio
                titulo="Nenhum orçamento"
                texto="Monte a proposta com os itens e o sistema calcula o total."
                acao={
                  <Link
                    href={`/orcamentos/novo?clienteId=${cliente.id}`}
                    className="btn btn-primario"
                  >
                    Montar orçamento
                  </Link>
                }
              />
            ) : (
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Título</th>
                    <th>Situação</th>
                    <th>Válido até</th>
                    <th className="num">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.orcamentos.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <Link href={`/orcamentos/${o.id}`} className="tnum hover:text-accent">
                          {o.numero}
                        </Link>
                      </td>
                      <td>{o.titulo}</td>
                      <td>
                        <EtiquetaStatus rotulo={rotulosStatusOrcamento[o.status]} />
                      </td>
                      <td className="tnum text-muted">{formatarData(o.validoAte)}</td>
                      <td className="num">{brl(o.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Painel>
        </div>
      )}

      <Regua />

      <AcoesArquivo cliente={cliente} />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Numero({
  rotulo,
  valor,
  detalhe,
  tom,
}: {
  rotulo: string;
  valor: React.ReactNode;
  detalhe?: string;
  tom?: "danger";
}) {
  return (
    <div className="border-t border-line pt-3">
      <p className="label">{rotulo}</p>
      <p
        className={[
          "mt-1 text-[1.5rem] leading-none font-500 tnum",
          tom === "danger" ? "text-danger" : "",
        ].join(" ")}
      >
        {valor}
      </p>
      {detalhe && <p className="mt-1 text-[0.8125rem] text-faint">{detalhe}</p>}
    </div>
  );
}

function AbaResumo({ dados }: { dados: NonNullable<Awaited<ReturnType<typeof detalheCliente>>> }) {
  const { cliente, resumo } = dados;

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <Painel titulo="Dados cadastrais">
        <div className="flex flex-col">
          <LinhaDado rotulo="Razão social" valor={cliente.nome} />
          {cliente.nomeFantasia && (
            <LinhaDado rotulo="Nome fantasia" valor={cliente.nomeFantasia} />
          )}
          {(cliente.cnpj || cliente.cpf) && (
            <LinhaDado
              rotulo={cliente.cnpj ? "CNPJ" : "CPF"}
              valor={mascararDocumento(cliente.cnpj ?? cliente.cpf)}
            />
          )}
          <LinhaDado
            rotulo="Contato"
            valor={
              cliente.contatoNome
                ? [cliente.contatoNome, cliente.contatoCargo].filter(Boolean).join(" · ")
                : "—"
            }
          />
          {cliente.contatoTelefone && (
            <LinhaDado rotulo="Telefone" valor={mascararTelefone(cliente.contatoTelefone)} />
          )}
          {cliente.contatoEmail && (
            <LinhaDado rotulo="E-mail" valor={cliente.contatoEmail} />
          )}
          {cliente.whatsapp && (
            <LinhaDado rotulo="WhatsApp" valor={mascararTelefone(cliente.whatsapp)} />
          )}
          <LinhaDado
            rotulo="Setor público"
            valor={cliente.setorPublico ? "Sim" : "Não"}
          />
          {cliente.origem && <LinhaDado rotulo="Origem" valor={cliente.origem} />}
          {cliente.endereco && <LinhaDado rotulo="Endereço" valor={cliente.endereco} />}
          <LinhaDado
            rotulo="Localidade"
            valor={
              [cliente.cidade, cliente.uf].filter(Boolean).join("/") || "—"
            }
          />
          <LinhaDado
            rotulo="Cliente desde"
            valor={formatarData(resumo.primeiroContato ?? cliente.criadoEm.slice(0, 10))}
          />
        </div>
        {cliente.observacoes && (
          <p className="mt-4 border-t border-line pt-4 text-[0.875rem] leading-relaxed whitespace-pre-line text-muted">
            {cliente.observacoes}
          </p>
        )}
      </Painel>

      <div className="flex flex-col gap-8">
        <Painel
          titulo="Conformidade"
          descricao="Relatórios de diagnóstico deste cliente."
          acoes={
            <Link
              href={`/conformidade/nova?clienteId=${cliente.id}`}
              className="text-[0.8125rem] text-accent hover:underline"
            >
              Nova análise
            </Link>
          }
        >
          {dados.analises.length === 0 ? (
            <Vazio
              titulo="Nenhum diagnóstico emitido"
              texto="Responda o questionário com o cliente e o relatório sai pronto para enviar."
              acao={
                <Link
                  href={`/conformidade/nova?clienteId=${cliente.id}`}
                  className="btn btn-primario"
                >
                  Iniciar diagnóstico
                </Link>
              }
            />
          ) : (
            <ul>
              {dados.analises.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-b-0"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/conformidade/${a.id}`}
                      className="block truncate text-[0.9375rem] hover:text-accent"
                    >
                      {a.titulo}
                    </Link>
                    <p className="text-[0.8125rem] text-faint">
                      {a.modelo} · {formatarData(a.emitidoEm)}
                    </p>
                  </div>
                  {a.indiceConformidade !== null ? (
                    <span className="shrink-0 text-[1.125rem] font-500 tnum">
                      {a.indiceConformidade}%
                    </span>
                  ) : (
                    <Etiqueta tom="mute">Rascunho</Etiqueta>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Painel>

        <Painel titulo="Últimos atendimentos" descricao="Os três mais recentes.">
          {dados.historico.length === 0 ? (
            <Vazio titulo="Histórico vazio" />
          ) : (
            <ul>
              {dados.historico.slice(0, 3).map((h) => (
                <li key={h.id} className="border-b border-line py-2.5 last:border-b-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[0.9375rem]">{h.titulo}</p>
                    <span className="shrink-0 text-[0.8125rem] text-faint tnum">
                      {formatarData(h.data)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[0.8125rem] text-muted">
                    {rotulosTipoAtendimento[h.tipo]}
                    {h.autor ? ` · ${h.autor}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Link
            href={`/clientes/${cliente.id}?aba=historico`}
            className="mt-3 inline-block text-[0.8125rem] text-accent hover:underline"
          >
            Ver histórico completo
          </Link>
        </Painel>
      </div>
    </div>
  );
}

function AbaHistorico({
  historico,
  clienteId,
  demandas,
}: {
  historico: Awaited<ReturnType<typeof detalheCliente>> extends null
    ? never
    : NonNullable<Awaited<ReturnType<typeof detalheCliente>>>["historico"];
  clienteId: string;
  demandas: { id: string; titulo: string }[];
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
      <div className="flex flex-col gap-8">
        <Painel titulo="Linha do tempo" descricao="Consulta 1, consulta 2, visita, entrega.">
          {historico.length === 0 ? (
            <Vazio titulo="Nenhum atendimento registrado" />
          ) : (
            <ol>
              {historico.map((h, i) => (
                <li key={h.id} className="relative flex gap-4 pb-6 last:pb-0">
                  {/* Fio vertical com número — a linha do tempo em vez de card. */}
                  <div className="flex flex-col items-center">
                    <span className="index-num">
                      {String(historico.length - i).padStart(2, "0")}
                    </span>
                    {i < historico.length - 1 && (
                      <span className="mt-1 w-px flex-1 bg-line" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 pb-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-500">{h.titulo}</p>
                      <span className="text-[0.8125rem] text-faint tnum">
                        {formatarData(h.data)}
                      </span>
                    </div>

                    <p className="mt-0.5 text-[0.8125rem] text-muted">
                      <Etiqueta tom="mute">{rotulosTipoAtendimento[h.tipo]}</Etiqueta>
                      {h.autor && <span className="ml-2">registrado por {h.autor}</span>}
                    </p>

                    {h.resumo && (
                      <p className="mt-2 text-[0.875rem] leading-relaxed whitespace-pre-line text-muted">
                        {h.resumo}
                      </p>
                    )}

                    {h.proximoPasso && (
                      <p className="mt-2 border-l-2 border-accent pl-3 text-[0.875rem]">
                        <span className="label">Próximo passo · </span>
                        {h.proximoPasso}
                        {h.dataProximoPasso && (
                          <span className="ml-1.5 text-faint tnum">
                            ({prazoRelativo(h.dataProximoPasso)})
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Painel>
      </div>

      <div className="flex flex-col gap-8">
        <Painel
          titulo="Registrar atendimento"
          descricao="O que aconteceu e o que ficou combinado."
        >
          <div id="atendimento">
            <FormAtendimento clienteId={clienteId} demandas={demandas} />
          </div>
        </Painel>
      </div>
    </div>
  );
}

function AbaDemandas({
  demandas,
  clienteId,
}: {
  demandas: { id: string; titulo: string; status: keyof typeof rotulosStatusDemanda; valorEstimado: number; dataAbertura: string | null; prazoDias: number | null; servico: string | null }[];
  clienteId: string;
}) {
  const abertas = demandas.filter((d) =>
    ["consulta", "diagnostico", "proposta", "contrato", "em_andamento"].includes(d.status),
  );

  return (
    <Painel
      titulo="Demandas"
      descricao="Cada linha do funil que esse cliente abriu."
      acoes={
        <Link href={`/demandas?clienteId=${clienteId}`} className="btn btn-secundario">
          <Icone nome="mais" tamanho={15} />
          Nova demanda
        </Link>
      }
    >
      {demandas.length === 0 ? (
        <Vazio titulo="Nenhuma demanda registrada" />
      ) : (
        <>
          <p className="label mb-3">{abertas.length} em aberto</p>
          <table className="tabela">
            <thead>
              <tr>
                <th>Demanda</th>
                <th>Etapa</th>
                <th>Abertura</th>
                <th className="num">Valor</th>
              </tr>
            </thead>
            <tbody>
              {demandas.map((d) => (
                <tr key={d.id}>
                  <td>
                    <Link href={`/demandas?status=${d.status}`} className="hover:text-accent">
                      {d.titulo}
                    </Link>
                    {d.servico && (
                      <p className="text-[0.8125rem] text-faint">{d.servico}</p>
                    )}
                  </td>
                  <td>
                    <EtiquetaStatus rotulo={rotulosStatusDemanda[d.status]} />
                  </td>
                  <td className="tnum text-muted">{formatarData(d.dataAbertura)}</td>
                  <td className="num">{brl(d.valorEstimado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </Painel>
  );
}

function AbaDocumentos({
  documentos,
  clienteId,
}: {
  documentos: { id: string; nome: string; tipo: string | null; orgao: string | null; numero: string | null; emissao: string | null; validade: string | null; status: string }[];
  clienteId: string;
}) {
  return (
    <Painel
      titulo="Documentos e vencimentos"
      descricao="Licenças, autorizações e certidões — com a data em que param de valer."
      acoes={
        <Link
          href={`/documentos?clienteId=${clienteId}`}
          className="btn btn-secundario"
        >
          <Icone nome="mais" tamanho={15} />
          Novo documento
        </Link>
      }
    >
      {documentos.length === 0 ? (
        <Vazio titulo="Nenhum documento" />
      ) : (
        <table className="tabela">
          <thead>
            <tr>
              <th>Documento</th>
              <th>Órgão</th>
              <th>Validade</th>
              <th>Situação</th>
            </tr>
          </thead>
          <tbody>
            {documentos.map((d) => {
              const dias = diasAte(d.validade);
              return (
                <tr key={d.id}>
                  <td>
                    {d.nome}
                    {d.tipo && <p className="text-[0.8125rem] text-faint">{d.tipo}</p>}
                  </td>
                  <td className="text-muted">
                    {d.orgao ?? "—"}
                    {d.numero && (
                      <p className="text-[0.8125rem] text-faint tnum">{d.numero}</p>
                    )}
                  </td>
                  <td className="tnum text-muted">{formatarData(d.validade)}</td>
                  <td>
                    {d.status === "nao_aplicavel" ? (
                      <Etiqueta tom="mute">Não se aplica</Etiqueta>
                    ) : dias === null ? (
                      <Etiqueta tom="mute">Sem prazo</Etiqueta>
                    ) : (
                      <Etiqueta tom={tomDeVencimento(dias)}>{prazoRelativo(d.validade)}</Etiqueta>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Painel>
  );
}

function AcoesArquivo({ cliente }: { cliente: Cliente }) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
      <p className="label">Situação do cadastro</p>
      <div className="flex flex-wrap gap-2">
        {(["potencial", "ativo", "inativo"] as const).map((s) => (
          <form key={s} action={mudarStatusCliente}>
            <input type="hidden" name="id" value={cliente.id} />
            <input type="hidden" name="status" value={s} />
            <button
              type="submit"
              disabled={cliente.status === s}
              className="btn btn-secundario"
            >
              {rotulosStatusCliente[s]}
            </button>
          </form>
        ))}

        {cliente.status === "arquivado" ? (
          <form action={restaurarCliente}>
            <input type="hidden" name="id" value={cliente.id} />
            <button type="submit" className="btn btn-secundario">
              <Icone nome="imprimir" tamanho={15} />
              Restaurar
            </button>
          </form>
        ) : (
          <form action={arquivarCliente}>
            <input type="hidden" name="id" value={cliente.id} />
            <button type="submit" className="btn btn-perigo">
              Arquivar
            </button>
          </form>
        )}
      </div>
      <p className="text-[0.8125rem] text-faint">
        Arquivar tira da lista — o histórico nunca é apagado.
      </p>
    </div>
  );
}