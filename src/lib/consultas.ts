/**
 * Consultas de leitura.
 *
 * Tudo que a tela mostra passa por aqui, para as páginas ficarem finas e
 * não repetirem `join` espalhado. Nenhuma delas escreve.
 */

import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  lt,
  lte,
  ne,
  sql,
  sum,
} from "drizzle-orm";

import { db } from "@/db";
import {
  analisesConformidade,
  atendimentos,
  clientes,
  contratos,
  demandas,
  despesas,
  documentos,
  funilOrdem,
  lancamentos,
  modelosConformidade,
  orcamentos,
  pagamentos,
  rotulosFormaPagamento,
  rotulosStatusCliente,
  rotulosStatusDemanda,
  servicos,
  usuarios,
  type ClienteStatus,
  type DemandaStatus,
} from "@/db/schema";
import {
  diferencaDias,
  hoje,
  janelaMeses,
  rotuloMesChave,
  somaDias,
} from "@/lib/dates";
import { semAcento } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Tipos de apoio                                                      */
/* ------------------------------------------------------------------ */

export type ClienteLista = {
  id: string;
  nome: string;
  cidade: string | null;
  uf: string | null;
  status: ClienteStatus;
  segmento: string | null;
  contatoNome: string | null;
  criadoEm: string;
  demandasAbertas: number;
  contratosAtivos: number;
  aReceber: number;
  atrasado: number;
};

/* ------------------------------------------------------------------ */
/* Painel                                                              */
/* ------------------------------------------------------------------ */

export async function resumoPainel(ano: number) {
  const inicioAno = `${ano}-01-01`;
  const fimAno = `${ano}-12-31`;
  const hj = hoje();

  /* --- Faturamento: o que foi efetivamente recebido no ano --- */
  const [recebido] = await db
    .select({ total: sum(pagamentos.valor) })
    .from(pagamentos)
    .where(
      and(
        eq(pagamentos.tipo, "pagamento"),
        gte(pagamentos.data, inicioAno),
        lte(pagamentos.data, fimAno),
      ),
    );

  /* --- Descontos dados no ano (valor negativo no histórico) --- */
  const [descontos] = await db
    .select({ total: sum(pagamentos.valor) })
    .from(pagamentos)
    .where(
      and(
        eq(pagamentos.tipo, "desconto"),
        gte(pagamentos.data, inicioAno),
        lte(pagamentos.data, fimAno),
      ),
    );

  /* --- A receber de tudo que está aberto, e o que já atrasou --- */
  const [aberto] = await db
    .select({ total: sum(lancamentos.valor), n: count() })
    .from(lancamentos)
    .where(
      inArray(lancamentos.status, ["pendente", "atrasado"]),
    );

  const [atrasado] = await db
    .select({ total: sum(lancamentos.valor), n: count() })
    .from(lancamentos)
    .where(
      and(
        eq(lancamentos.status, "pendente"),
        lt(lancamentos.vencimento, hj),
      ),
    );

  /* --- Vencendo nos próximos 30 dias --- */
  const [proximos] = await db
    .select({ total: sum(lancamentos.valor), n: count() })
    .from(lancamentos)
    .where(
      and(
        eq(lancamentos.status, "pendente"),
        gte(lancamentos.vencimento, hj),
        lte(lancamentos.vencimento, somaDias(hj, 30)),
      ),
    );

  /* --- Despesas do ano --- */
  const [gasto] = await db
    .select({ total: sum(despesas.valor) })
    .from(despesas)
    .where(
      and(gte(despesas.data, inicioAno), lte(despesas.data, fimAno)),
    );

  /* --- Carteira --- */
  const [ativos] = await db
    .select({ n: count() })
    .from(clientes)
    .where(eq(clientes.status, "ativo"));

  const [potenciais] = await db
    .select({ n: count() })
    .from(clientes)
    .where(eq(clientes.status, "potencial"));

  const [contratosAtivos] = await db
    .select({ n: count() })
    .from(contratos)
    .where(inArray(contratos.status, ["ativo", "assinado"]));

  const [docsVencendo] = await db
    .select({ n: count() })
    .from(documentos)
    .where(
      and(
        ne(documentos.status, "nao_aplicavel"),
        lte(documentos.validade, somaDias(hj, 30)),
      ),
    );

  /* --- Atendimentos no mês --- */
  const [atendimentosMes] = await db
    .select({ n: count() })
    .from(atendimentos)
    .where(
      and(
        gte(atendimentos.data, `${hj.slice(0, 7)}-01`),
        lte(atendimentos.data, hj),
      ),
    );

  const totalRecebido = Number(recebido?.total ?? 0);
  const totalDesconto = Math.abs(Number(descontos?.total ?? 0));
  const totalDespesa = Number(gasto?.total ?? 0);

  return {
    ano,
    faturamento: totalRecebido,
    descontos: totalDesconto,
    liquido: totalRecebido - totalDespesa,
    despesas: totalDespesa,
    aReceber: Number(aberto?.total ?? 0),
    aReceberCount: aberto?.n ?? 0,
    atrasado: Number(atrasado?.total ?? 0),
    atrasadoCount: atrasado?.n ?? 0,
    proximos: Number(proximos?.total ?? 0),
    proximosCount: proximos?.n ?? 0,
    clientesAtivos: ativos?.n ?? 0,
    potenciais: potenciais?.n ?? 0,
    contratosAtivos: contratosAtivos?.n ?? 0,
    docsVencendo: docsVencendo?.n ?? 0,
    atendimentosMes: atendimentosMes?.n ?? 0,
  };
}

/** Faturamento recebido mês a mês — a série que vira o gráfico de barras. */
export async function serieMensal(ano: number) {
  const inicio = `${ano}-01-01`;
  const fim = `${ano}-12-31`;

  const linhas = await db
    .select({
      data: pagamentos.data,
      valor: pagamentos.valor,
    })
    .from(pagamentos)
    .where(
      and(
        eq(pagamentos.tipo, "pagamento"),
        gte(pagamentos.data, inicio),
        lte(pagamentos.data, fim),
      ),
    );

  const meses = janelaMeses(12, `${ano}-12-31`);
  const serie = meses.map((m) => ({ mes: m, rotulo: rotuloMesChave(m), valor: 0 }));

  for (const l of linhas) {
    const chave = l.data.slice(0, 7);
    const alvo = serie.find((s) => s.mes === chave);
    // `sum()` pode devolver string no libSQL — normalizamos sempre.
    if (alvo) alvo.valor += Number(l.valor ?? 0);
  }

  return serie;
}

/** Funil de demandas: quantas estão em cada etapa. */
export async function funil() {
  const linhas = await db
    .select({ status: demandas.status, n: count(), valor: sum(demandas.valorEstimado) })
    .from(demandas)
    .where(ne(demandas.status, "cancelado"))
    .groupBy(demandas.status);

  const mapa = new Map<string, { n: number; valor: number }>(
    linhas.map((l) => [l.status, { n: l.n, valor: Number(l.valor ?? 0) }]),
  );

  return funilOrdem.map((status: DemandaStatus) => ({
    status,
    rotulo: rotulosStatusDemanda[status],
    n: mapa.get(status)?.n ?? 0,
    valor: mapa.get(status)?.valor ?? 0,
  }));
}

/** Próximas contas a receber — o que a Layane precisa cobrar. */
export async function proximasContas(limite = 6) {
  return db
    .select({
      id: lancamentos.id,
      descricao: lancamentos.descricao,
      valor: lancamentos.valor,
      vencimento: lancamentos.vencimento,
      status: lancamentos.status,
      cliente: clientes.nome,
      clienteId: lancamentos.clienteId,
    })
    .from(lancamentos)
    .innerJoin(clientes, eq(lancamentos.clienteId, clientes.id))
    .where(inArray(lancamentos.status, ["pendente", "atrasado"]))
    .orderBy(asc(lancamentos.vencimento))
    .limit(limite);
}

/** Documentos de clientes vencendo nos próximos 60 dias. */
export async function documentosVencendo(limite = 6) {
  return db
    .select({
      id: documentos.id,
      nome: documentos.nome,
      tipo: documentos.tipo,
      validade: documentos.validade,
      cliente: clientes.nome,
      clienteId: documentos.clienteId,
    })
    .from(documentos)
    .innerJoin(clientes, eq(documentos.clienteId, clientes.id))
    .where(
      and(
        ne(documentos.status, "nao_aplicavel"),
        lte(documentos.validade, somaDias(hoje(), 60)),
      ),
    )
    .orderBy(asc(documentos.validade))
    .limit(limite);
}

/** Clientes que mais pagaram no ano — ranking. */
export async function topClientes(ano: number, limite = 5) {
  return db
    .select({
      clienteId: clientes.id,
      nome: clientes.nome,
      total: sum(pagamentos.valor),
    })
    .from(pagamentos)
    .innerJoin(lancamentos, eq(pagamentos.lancamentoId, lancamentos.id))
    .innerJoin(clientes, eq(lancamentos.clienteId, clientes.id))
    .where(
      and(
        eq(pagamentos.tipo, "pagamento"),
        gte(pagamentos.data, `${ano}-01-01`),
        lte(pagamentos.data, `${ano}-12-31`),
      ),
    )
    .groupBy(clientes.id, clientes.nome)
    .orderBy(desc(sum(pagamentos.valor)))
    .limit(limite);
}

/** Próximos passos combinados — o "me ligue depois" que vira lista. */
export async function proximosPassos(limite = 6) {
  return db
    .select({
      id: atendimentos.id,
      proximoPasso: atendimentos.proximoPasso,
      dataProximoPasso: atendimentos.dataProximoPasso,
      cliente: clientes.nome,
      clienteId: atendimentos.clienteId,
    })
    .from(atendimentos)
    .innerJoin(clientes, eq(atendimentos.clienteId, clientes.id))
    .where(sql`${atendimentos.proximoPasso} is not null`)
    .orderBy(asc(atendimentos.dataProximoPasso))
    .limit(limite);
}

/* ------------------------------------------------------------------ */
/* Clientes                                                            */
/* ------------------------------------------------------------------ */

export async function listarClientes(filtros: {
  busca?: string;
  status?: string;
  cidade?: string;
  /** Clientes que têm contrato ativo — atalho do filtro "carteira". */
  apenasAtivos?: boolean;
}): Promise<ClienteLista[]> {
  const condicoes = [];

  if (filtros.busca) {
    const alvo = `%${filtros.busca.toLowerCase()}%`;
    /* `unaccent` + `lower` no banco, e não o `normalizar()` do JS: passar
       a coluna por uma função JS dentro do template `sql` faz o Drizzle
       tratar o RESULTADO como parâmetro — a consulta virava
       `where ($1 like $2)` com a string `'[object object]'` no lugar da
       coluna, e a busca não retornava nada. A remoção de acento precisa
       acontecer no Postgres, onde a coluna continua sendo a coluna. */
    condicoes.push(
      sql`(${semAcento(clientes.nome)} like ${alvo}
        or ${semAcento(clientes.nomeFantasia)} like ${alvo}
        or ${semAcento(clientes.cidade)} like ${alvo}
        or ${semAcento(clientes.contatoNome)} like ${alvo}
        or ${semAcento(clientes.cnpj)} like ${alvo})`,
    );
  }

  if (filtros.status && filtros.status !== "todos") {
    condicoes.push(eq(clientes.status, filtros.status as never));
  }

  if (filtros.apenasAtivos) {
    condicoes.push(eq(clientes.status, "ativo"));
  }

  const linhas = await db
    .select({
      id: clientes.id,
      nome: clientes.nome,
      cidade: clientes.cidade,
      uf: clientes.uf,
      status: clientes.status,
      segmento: clientes.segmento,
      contatoNome: clientes.contatoNome,
      criadoEm: clientes.criadoEm,
    })
    .from(clientes)
    .where(condicoes.length ? and(...condicoes) : undefined)
    .orderBy(asc(clientes.nome));

  if (linhas.length === 0) return [];

  const ids = linhas.map((l) => l.id);

  const demandasPorCliente = await db
    .select({ clienteId: demandas.clienteId, n: count() })
    .from(demandas)
    .where(
      and(
        inArray(demandas.clienteId, ids),
        inArray(demandas.status, ["consulta", "diagnostico", "proposta", "contrato", "em_andamento"]),
      ),
    )
    .groupBy(demandas.clienteId);

  const contratosPorCliente = await db
    .select({ clienteId: contratos.clienteId, n: count() })
    .from(contratos)
    .where(and(inArray(contratos.clienteId, ids), inArray(contratos.status, ["ativo", "assinado"])))
    .groupBy(contratos.clienteId);

  const abertoPorCliente = await db
    .select({ clienteId: lancamentos.clienteId, total: sum(lancamentos.valor) })
    .from(lancamentos)
    .where(and(inArray(lancamentos.clienteId, ids), inArray(lancamentos.status, ["pendente", "atrasado"])))
    .groupBy(lancamentos.clienteId);

  const atrasadoPorCliente = await db
    .select({ clienteId: lancamentos.clienteId, total: sum(lancamentos.valor) })
    .from(lancamentos)
    .where(
      and(
        inArray(lancamentos.clienteId, ids),
        eq(lancamentos.status, "pendente"),
        lt(lancamentos.vencimento, hoje()),
      ),
    )
    .groupBy(lancamentos.clienteId);

  const comoMapa = (
    linhas: { clienteId: string; n?: number; total?: string | number | null }[],
  ) => new Map(linhas.map((l) => [l.clienteId, l]));

  const mD = comoMapa(demandasPorCliente);
  const mC = comoMapa(contratosPorCliente);
  const mA = comoMapa(abertoPorCliente);
  const mAt = comoMapa(atrasadoPorCliente);

  return linhas.map((l) => ({
    ...l,
    demandasAbertas: mD.get(l.id)?.n ?? 0,
    contratosAtivos: mC.get(l.id)?.n ?? 0,
    aReceber: Number(mA.get(l.id)?.total ?? 0),
    atrasado: Number(mAt.get(l.id)?.total ?? 0),
  }));
}

/** Tudo que a tela de um cliente mostra, em uma volta. */
export async function detalheCliente(id: string) {
  const linhas = await db.select().from(clientes).where(eq(clientes.id, id)).limit(1);
  const cliente = linhas[0];
  if (!cliente) return null;

  const historico = await db
    .select({
      id: atendimentos.id,
      data: atendimentos.data,
      tipo: atendimentos.tipo,
      titulo: atendimentos.titulo,
      resumo: atendimentos.resumo,
      proximoPasso: atendimentos.proximoPasso,
      dataProximoPasso: atendimentos.dataProximoPasso,
      autor: usuarios.nome,
    })
    .from(atendimentos)
    .leftJoin(usuarios, eq(atendimentos.criadoPor, usuarios.id))
    .where(eq(atendimentos.clienteId, id))
    .orderBy(desc(atendimentos.data), desc(atendimentos.criadoEm));

  const listaDemandas = await db
    .select({
      id: demandas.id,
      titulo: demandas.titulo,
      status: demandas.status,
      valorEstimado: demandas.valorEstimado,
      dataAbertura: demandas.dataAbertura,
      prazoDias: demandas.prazoDias,
      servico: servicos.nome,
    })
    .from(demandas)
    .leftJoin(servicos, eq(demandas.servicoId, servicos.id))
    .where(eq(demandas.clienteId, id))
    .orderBy(desc(demandas.criadoEm));

  const listaDocs = await db
    .select()
    .from(documentos)
    .where(eq(documentos.clienteId, id))
    .orderBy(asc(documentos.validade));

  const listaContratos = await db
    .select({
      id: contratos.id,
      numero: contratos.numero,
      titulo: contratos.titulo,
      status: contratos.status,
      inicio: contratos.inicio,
      fim: contratos.fim,
      valorTotal: contratos.valorTotal,
      parcelas: contratos.parcelas,
    })
    .from(contratos)
    .where(eq(contratos.clienteId, id))
    .orderBy(desc(contratos.criadoEm));

  const listaOrcamentos = await db
    .select({
      id: orcamentos.id,
      numero: orcamentos.numero,
      titulo: orcamentos.titulo,
      status: orcamentos.status,
      total: orcamentos.total,
      validoAte: orcamentos.validoAte,
    })
    .from(orcamentos)
    .where(eq(orcamentos.clienteId, id))
    .orderBy(desc(orcamentos.criadoEm));

  const listaLancamentos = await db
    .select()
    .from(lancamentos)
    .where(eq(lancamentos.clienteId, id))
    .orderBy(desc(lancamentos.vencimento), desc(lancamentos.criadoEm));

  const listaAnalises = await db
    .select({
      id: analisesConformidade.id,
      titulo: analisesConformidade.titulo,
      status: analisesConformidade.status,
      indiceConformidade: analisesConformidade.indiceConformidade,
      emitidoEm: analisesConformidade.emitidoEm,
      modelo: sql<string>`(select nome from ${modelosConformidade} where id = ${analisesConformidade.modeloId})`,
    })
    .from(analisesConformidade)
    .where(eq(analisesConformidade.clienteId, id))
    .orderBy(desc(analisesConformidade.criadoEm));

  const aberto = listaLancamentos.filter((l) => l.status === "pendente" || l.status === "atrasado");
  const recebido = listaLancamentos
    .filter((l) => l.status === "pago")
    .reduce((acc, l) => acc + (l.valorRecebido ?? l.valor), 0);

  return {
    cliente,
    historico: historico ?? [],
    demandas: listaDemandas ?? [],
    documentos: listaDocs ?? [],
    contratos: listaContratos ?? [],
    orcamentos: listaOrcamentos ?? [],
    lancamentos: listaLancamentos ?? [],
    analises: listaAnalises ?? [],
    resumo: {
      aReceber: aberto.reduce((a, l) => a + l.valor, 0),
      atrasado: aberto
        .filter((l) => l.vencimento && l.vencimento < hoje())
        .reduce((a, l) => a + l.valor, 0),
      recebido,
      demandasAbertas: (listaDemandas ?? []).filter((d) =>
        ["consulta", "diagnostico", "proposta", "contrato", "em_andamento"].includes(d.status),
      ).length,
      proximoContato: historico?.find((h) => h.dataProximoPasso)?.dataProximoPasso ?? null,
      primeiroContato: historico?.[historico.length - 1]?.data ?? null,
    },
  };
}

export type DetalheCliente = NonNullable<Awaited<ReturnType<typeof detalheCliente>>>;

/* ------------------------------------------------------------------ */
/* Listas simples (todas as outras telas)                              */
/* ------------------------------------------------------------------ */

export async function listarDemandas(filtros: {
  status?: string;
  clienteId?: string;
}) {
  return db
    .select({
      id: demandas.id,
      titulo: demandas.titulo,
      status: demandas.status,
      valorEstimado: demandas.valorEstimado,
      probabilidade: demandas.probabilidade,
      prazoDias: demandas.prazoDias,
      dataAbertura: demandas.dataAbertura,
      atualizadoEm: demandas.atualizadoEm,
      clienteId: demandas.clienteId,
      cliente: clientes.nome,
      servico: servicos.nome,
      responsavel: usuarios.nome,
    })
    .from(demandas)
    .innerJoin(clientes, eq(demandas.clienteId, clientes.id))
    .leftJoin(servicos, eq(demandas.servicoId, servicos.id))
    .leftJoin(usuarios, eq(demandas.responsavelId, usuarios.id))
    .where(
      filtros.status && filtros.status !== "todos"
        ? eq(demandas.status, filtros.status as never)
        : filtros.clienteId
          ? eq(demandas.clienteId, filtros.clienteId)
          : undefined,
    )
    .orderBy(desc(demandas.atualizadoEm));
}

export async function listarDocumentos(filtros: {
  janela?: "30" | "60" | "90" | "todos";
  clienteId?: string;
  texto?: string;
}) {
  const condicoes = [];
  const hj = hoje();

  if (filtros.janela && filtros.janela !== "todos") {
    // Filtra pela validade real — o status derivado nunca entra na query,
    // senão o filtro e o badge discordariam.
    condicoes.push(
      lte(documentos.validade, somaDias(hj, Number(filtros.janela))),
      ne(documentos.status, "nao_aplicavel"),
    );
  }
  if (filtros.clienteId) condicoes.push(eq(documentos.clienteId, filtros.clienteId));
  if (filtros.texto) {
    condicoes.push(
      sql`${semAcento(documentos.nome)} like ${`%${filtros.texto.toLowerCase()}%`}`,
    );
  }

  const linhas = await db
    .select({
      id: documentos.id,
      nome: documentos.nome,
      tipo: documentos.tipo,
      orgao: documentos.orgao,
      numero: documentos.numero,
      emissao: documentos.emissao,
      validade: documentos.validade,
      status: documentos.status,
      clienteId: documentos.clienteId,
      cliente: clientes.nome,
    })
    .from(documentos)
    .innerJoin(clientes, eq(documentos.clienteId, clientes.id))
    .where(condicoes.length ? and(...condicoes) : undefined)
    .orderBy(asc(documentos.validade));

  // Deriva o status a partir da validade, aqui e agora.
  return linhas.map((l) => ({
    ...l,
    status: statusDeVencimento(l.status, l.validade),
    diasParaVencer: l.validade ? diferencaDias(hj, l.validade) : null,
  }));
}

/**
 * Status de vencimento de um documento.
 *
 * **Derivado na leitura, nunca gravado.** O `status` guardado no banco só
 * guarda a decisão da Layane (`nao_aplicavel`); o resto é calculado a
 * partir da validade toda vez que a tela abre. Isso evita rotina noturna,
 * evita escrita durante o render e faz o número da tela bater com a
 * reality do calendário.
 */
export function statusDeVencimento(
  statusGuardado: string,
  validade: string | null,
): string {
  if (statusGuardado === "nao_aplicavel") return "nao_aplicavel";
  if (!validade) return statusGuardado;

  const dias = diferencaDias(hoje(), validade);
  if (dias < 0) return "vencido";
  if (dias <= 30) return "a_vencer";
  return "valido";
}

/** Diários owed com dias até o vencimento calculados no servidor. */
export async function listarLancamentos(filtros: {
  ano?: string;
  status?: string;
  clienteId?: string;
}) {
  const condicoes = [];

  if (filtros.ano && filtros.ano !== "todos") {
    condicoes.push(
      sql`(substring(${lancamentos.vencimento}, 1, 4) = ${filtros.ano})`,
    );
  }
  if (filtros.status && filtros.status !== "todos") {
    if (filtros.status === "atrasado") {
      condicoes.push(
        eq(lancamentos.status, "pendente"),
        lt(lancamentos.vencimento, hoje()),
      );
    } else {
      condicoes.push(eq(lancamentos.status, filtros.status as never));
    }
  }
  if (filtros.clienteId) condicoes.push(eq(lancamentos.clienteId, filtros.clienteId));

  const linhas = await db
    .select({
      id: lancamentos.id,
      descricao: lancamentos.descricao,
      valor: lancamentos.valor,
      vencimento: lancamentos.vencimento,
      status: lancamentos.status,
      pagoEm: lancamentos.pagoEm,
      formaPagamento: lancamentos.formaPagamento,
      valorRecebido: lancamentos.valorRecebido,
      observacoes: lancamentos.observacoes,
      clienteId: lancamentos.clienteId,
      cliente: clientes.nome,
      contratoId: lancamentos.contratoId,
    })
    .from(lancamentos)
    .innerJoin(clientes, eq(lancamentos.clienteId, clientes.id))
    .where(condicoes.length ? and(...condicoes) : undefined)
    .orderBy(desc(lancamentos.vencimento));

  const hj = hoje();
  return linhas.map((l) => ({
    ...l,
    diasAtrasVencimento: l.vencimento ? diferencaDias(hj, l.vencimento) : null,
    atrasado: l.status === "pendente" && l.vencimento ? l.vencimento < hj : false,
  }));
}

export async function listarOrcamentos(filtros: { status?: string }) {
  return db
    .select({
      id: orcamentos.id,
      numero: orcamentos.numero,
      titulo: orcamentos.titulo,
      status: orcamentos.status,
      total: orcamentos.total,
      descontoValor: orcamentos.descontoValor,
      descontoPercentual: orcamentos.descontoPercentual,
      validoAte: orcamentos.validoAte,
      criadoEm: orcamentos.criadoEm,
      clienteId: orcamentos.clienteId,
      cliente: clientes.nome,
    })
    .from(orcamentos)
    .innerJoin(clientes, eq(orcamentos.clienteId, clientes.id))
    .where(
      filtros.status && filtros.status !== "todos"
        ? eq(orcamentos.status, filtros.status as never)
        : undefined,
    )
    .orderBy(desc(orcamentos.criadoEm));
}

export async function detalheOrcamento(id: string) {
  const linhas = await db
    .select({ orcamento: orcamentos, nomeCliente: clientes.nome, cnpj: clientes.cnpj })
    .from(orcamentos)
    .innerJoin(clientes, eq(orcamentos.clienteId, clientes.id))
    .where(eq(orcamentos.id, id))
    .limit(1);
  return linhas[0] ?? null;
}

export async function listarContratos(filtros: { status?: string }) {
  return db
    .select({
      id: contratos.id,
      numero: contratos.numero,
      titulo: contratos.titulo,
      status: contratos.status,
      inicio: contratos.inicio,
      fim: contratos.fim,
      valorTotal: contratos.valorTotal,
      parcelas: contratos.parcelas,
      clienteId: contratos.clienteId,
      cliente: clientes.nome,
    })
    .from(contratos)
    .innerJoin(clientes, eq(contratos.clienteId, clientes.id))
    .where(
      filtros.status && filtros.status !== "todos"
        ? eq(contratos.status, filtros.status as never)
        : undefined,
    )
    .orderBy(desc(contratos.criadoEm));
}

export async function detalheContrato(id: string) {
  const linhas = await db
    .select({ contrato: contratos, nomeCliente: clientes.nome, cnpj: clientes.cnpj })
    .from(contratos)
    .innerJoin(clientes, eq(contratos.clienteId, clientes.id))
    .where(eq(contratos.id, id))
    .limit(1);
  return linhas[0] ?? null;
}

export async function listarAnalises(filtros: { status?: string }) {
  return db
    .select({
      id: analisesConformidade.id,
      titulo: analisesConformidade.titulo,
      status: analisesConformidade.status,
      indiceConformidade: analisesConformidade.indiceConformidade,
      emitidoEm: analisesConformidade.emitidoEm,
      criadoEm: analisesConformidade.criadoEm,
      clienteId: analisesConformidade.clienteId,
      cliente: clientes.nome,
      modelo: sql<string>`(select nome from ${modelosConformidade} where id = ${analisesConformidade.modeloId})`,
    })
    .from(analisesConformidade)
    .innerJoin(clientes, eq(analisesConformidade.clienteId, clientes.id))
    .where(
      filtros.status && filtros.status !== "todos"
        ? eq(analisesConformidade.status, filtros.status as never)
        : undefined,
    )
    .orderBy(desc(analisesConformidade.criadoEm));
}

export async function detalheAnalise(id: string) {
  const linhas = await db
    .select({
      analise: analisesConformidade,
      nomeCliente: clientes.nome,
      cnpj: clientes.cnpj,
      cidade: clientes.cidade,
      uf: clientes.uf,
      nomeModelo: sql<string>`(select nome from ${modelosConformidade} where id = ${analisesConformidade.modeloId})`,
    })
    .from(analisesConformidade)
    .innerJoin(clientes, eq(analisesConformidade.clienteId, clientes.id))
    .where(eq(analisesConformidade.id, id))
    .limit(1);
  return linhas[0] ?? null;
}

/** Opções para selects — cliente, serviço. */
export async function opcoesClientes() {
  return db
    .select({ id: clientes.id, nome: clientes.nome })
    .from(clientes)
    .where(ne(clientes.status, "arquivado"))
    .orderBy(asc(clientes.nome));
}

export async function opcoesServicos() {
  return db
    .select({ id: servicos.id, nome: servicos.nome, precoPadrao: servicos.precoPadrao })
    .from(servicos)
    .where(eq(servicos.ativo, true))
    .orderBy(asc(servicos.nome));
}

/** Anos com movimento financeiro — alimenta o filtro "faturei no ano". */
export async function anosComMovimento(): Promise<number[]> {
  const linhas = await db
    .select({ ano: sql<string>`substring(${pagamentos.data}, 1, 4)` })
    .from(pagamentos)
    .groupBy(sql`substring(${pagamentos.data}, 1, 4)`);

  const anos = linhas
    .map((l) => Number(l.ano))
    .filter((n) => Number.isFinite(n) && n > 2000);
  anos.push(new Date().getFullYear());
  return [...new Set(anos)].sort((a, b) => b - a);
}

/** Próxima numeração sequencial de um documento (ORC-2026-0007). */
export async function proximoNumero(
  tabela: typeof orcamentos | typeof contratos,
  prefixo: string,
): Promise<string> {
  const ano = new Date().getFullYear();
  const coluna = tabela === orcamentos ? orcamentos.numero : contratos.numero;
  const linhas = await db
    .select({ numero: coluna })
    .from(tabela)
    .where(sql`${coluna} like ${`${prefixo}-${ano}-%`}`)
    .orderBy(desc(coluna))
    .limit(1);

  const ultimo = linhas[0]?.numero;
  const seq = ultimo ? Number(ultimo.split("-").pop()) + 1 : 1;
  return `${prefixo}-${ano}-${String(seq).padStart(4, "0")}`;
}

/** Formas de pagamento para os selects. */
export const formasPagamento = rotulosFormaPagamento;