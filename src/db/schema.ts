/**
 * Schema do sistema interno — Layane Marques | Gestão Ambiental Aplicada.
 *
 * Regras que valem para todas as tabelas:
 * - Dinheiro SEMPRE em `integer` de centavos. Nunca float, nunca string.
 * - Data sempre em `text` no formato `YYYY-MM-DD`; data+hora em ISO `8601`.
 * - Toda tabela de negócio carrega `created_at` e `created_by` (quem registrou).
 * - Nada é apagado em cascata quando há histórico: cliente com atendimento
 *   vira `arquivado`, nunca `DELETE`.
 */

import { sql } from "drizzle-orm";
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import type { InferSelectModel } from "drizzle-orm";

/* ------------------------------------------------------------------ */
/* Helpers de coluna                                                   */
/* ------------------------------------------------------------------ */

/** Valor monetário em centavos. */
export const centavos = (name: string) =>
  integer(name).notNull().default(0);

/** `YYYY-MM-DD`. */
export const data = (name: string) => text(name);

const agora = () => sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`;

/* ------------------------------------------------------------------ */
/* Acesso                                                              */
/* ------------------------------------------------------------------ */

/** `admin` = Layane (tudo). `assistente` = pessoa administrativa. */
export const papelAdmin = "admin";
export const papelAssistente = "assistente";
export type Papel = typeof papelAdmin | typeof papelAssistente;

export const usuarios = sqliteTable(
  "usuarios",
  {
    id: text("id").primaryKey(),
    nome: text("nome").notNull(),
    email: text("email").notNull(),
    senhaHash: text("senha_hash").notNull(),
    papel: text("papel", {
      enum: [papelAdmin, papelAssistente],
    })
      .notNull()
      .default(papelAssistente),
    cargo: text("cargo"),
    ativo: integer("ativo", { mode: "boolean" }).notNull().default(true),
    ultimoAcessoEm: text("ultimo_acesso_em"),
    criadoEm: text("criado_em").notNull().default(agora()),
  },
  (t) => [uniqueIndex("usuarios_email_idx").on(t.email)],
);

export const sessoes = sqliteTable(
  "sessoes",
  {
    id: text("id").primaryKey(),
    usuarioId: text("usuario_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "cascade" }),
    expiraEm: text("expira_em").notNull(),
    criadoEm: text("criado_em").notNull().default(agora()),
  },
  (t) => [uniqueIndex("sessoes_token_idx").on(t.id)],
);

/* ------------------------------------------------------------------ */
/* Clientes                                                            */
/* ------------------------------------------------------------------ */

/** Ciclo de vida comercial do cliente. */
export const clienteStatus = [
  "potencial", // ainda não contratou — veio de indicação/site
  "ativo", // contrato em andamento
  "inativo", // cliente sem trabalho no momento
  "arquivado", // finished; some das listas padrão, mantém histórico
] as const;
export type ClienteStatus = (typeof clienteStatus)[number];

export const clientes = sqliteTable("clientes", {
  id: text("id").primaryKey(),
  /** Razão social ou nome do cliente. */
  nome: text("nome").notNull(),
  /** Nome fantasia, quando PJ. */
  nomeFantasia: text("nome_fantasia"),
  cnpj: text("cnpj"),
  /** PF: documento. */
  cpf: text("cpf"),
  /** Empresa é do setor público? Muda prazos e forma de contrato. */
  setorPublico: integer("setor_publico", { mode: "boolean" })
    .notNull()
    .default(false),

  contatoNome: text("contato_nome"),
  contatoCargo: text("contato_cargo"),
  contatoEmail: text("contato_email"),
  contatoTelefone: text("contato_telefone"),
  /** Telefone com DDD para WhatsApp. Sem máscara, só dígitos. */
  whatsapp: text("whatsapp"),

  segmento: text("segmento"),
  porte: text("porte"),
  endereco: text("endereco"),
  cidade: text("cidade"),
  uf: text("uf"),

  status: text("status", { enum: clienteStatus })
    .notNull()
    .default("potencial"),
  /** Como o cliente chegou — origem, referência, site, indicação. */
  origem: text("origem"),
  observacoes: text("observacoes"),

  criadoEm: text("criado_em").notNull().default(agora()),
  atualizadoEm: text("atualizado_em").notNull().default(agora()),
  criadoPor: text("criado_por").references(() => usuarios.id),
});

/* ------------------------------------------------------------------ */
/* Catálogo de serviços                                                */
/* ------------------------------------------------------------------ */

/**
 * Serviços que a Layane vende. Serve para três coisas:
 * orçamento (item), contrato (escopo) e dashboard (mix de faturamento).
 * Preço em centavos.
 */
export const servicos = sqliteTable("servicos", {
  id: text("id").primaryKey(),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  precoPadrao: centavos("preco_padrao"),
  /** `projeto` | `mensal` | `hora` | `licao` — muda como o preço é lido. */
  unidade: text("unidade").notNull().default("projeto"),
  ativo: integer("ativo", { mode: "boolean" }).notNull().default(true),
  criadoEm: text("criado_em").notNull().default(agora()),
});

/* ------------------------------------------------------------------ */
/* Demandas (pipeline comercial)                                       */
/* ------------------------------------------------------------------ */

/**
 * A "demanda" é a linha do funil: o que a Layane precisa entregar para
 * aquele cliente. Nasce da consulta e caminha até ser convertida em
 * contrato. O histórico de atendimento (aba seguinte) é o diário da demanda.
 */
export const demandaStatus = [
  "consulta", // primeiro contato, demanda ainda não entendida
  "diagnostico", // levantando dados / entendendo o cenário
  "proposta", // orçamento enviado, aguardando decisão
  "contrato", // convertido, aguardando assinatura/pagamento inicial
  "em_andamento", // contratado e sendo executado
  "concluido", // entregue
  "cancelado", // perdeu ou o cliente desistiu
] as const;
export type DemandaStatus = (typeof demandaStatus)[number];

export const demandas = sqliteTable("demandas", {
  id: text("id").primaryKey(),
  clienteId: text("cliente_id")
    .notNull()
    .references(() => clientes.id),
  titulo: text("titulo").notNull(),
  /** Serviço do catálogo (idempotente) — pode ser nulo se for sob medida. */
  servicoId: text("servico_id").references(() => servicos.id),
  descricao: text("descricao"),
  status: text("status", { enum: demandaStatus })
    .notNull()
    .default("consulta"),
  /** Preço considerado na negociação, em centavos. */
  valorEstimado: centavos("valor_estimado"),
  /** 0–100. Alimenta o funil do painel. */
  probabilidade: integer("probabilidade").notNull().default(10),
  /** Prazo combinado para entrega, em dias. */
  prazoDias: integer("prazo_dias"),
  dataAbertura: data("data_abertura"),
  dataFechamento: data("data_fechamento"),
  responsavelId: text("responsavel_id").references(() => usuarios.id),
  criadoEm: text("criado_em").notNull().default(agora()),
  atualizadoEm: text("atualizado_em").notNull().default(agora()),
  criadoPor: text("criado_por").references(() => usuarios.id),
});

/* ------------------------------------------------------------------ */
/* Atendimentos (histórico de relacionamento)                            */
/* ------------------------------------------------------------------ */

export const atendimentoTipo = [
  "consulta",
  "telefone",
  "whatsapp",
  "email",
  "reuniao",
  "visita_tecnica",
  "envio_documento",
  "cobranca",
  "outro",
] as const;
export type AtendimentoTipo = (typeof atendimentoTipo)[number];

export const atendimentos = sqliteTable("atendimentos", {
  id: text("id").primaryKey(),
  clienteId: text("cliente_id")
    .notNull()
    .references(() => clientes.id),
  /** O atendimento pertence a uma demanda do funil? */
  demandaId: text("demanda_id").references(() => demandas.id),
  data: data("data").notNull(),
  tipo: text("tipo", { enum: atendimentoTipo }).notNull().default("consulta"),
  titulo: text("titulo").notNull(),
  resumo: text("resumo"),
  /** O que ficou combinado para o próximo contato. */
  proximoPasso: text("proximo_passo"),
  dataProximoPasso: data("data_proximo_passo"),
  duracaoMin: integer("duracao_min"),
  criadoEm: text("criado_em").notNull().default(agora()),
  criadoPor: text("criado_por").references(() => usuarios.id),
});

/* ------------------------------------------------------------------ */
/* Documentos do cliente e vencimentos                                 */
/* ------------------------------------------------------------------ */

export const documentoStatus = [
  "valido",
  "a_vencer",
  "vencido",
  "nao_aplicavel",
] as const;
export type DocumentoStatus = (typeof documentoStatus)[number];

export const documentos = sqliteTable("documentos", {
  id: text("id").primaryKey(),
  clienteId: text("cliente_id")
    .notNull()
    .references(() => clientes.id),
  nome: text("nome").notNull(),
  /** Licença de Operação, CAR, AVCB, PGRSS, laudo... */
  tipo: text("tipo"),
  /** Órgão emissor. */
  orgao: text("orgao"),
  /** Número do documento / processo. */
  numero: text("numero"),
  emissao: data("emissao"),
  validade: data("validade"),
  /** Renova automaticamente a cada X dias após a emissão. */
  renovacaoDias: integer("renovacao_dias"),
  status: text("status", { enum: documentoStatus })
    .notNull()
    .default("valido"),
  observacoes: text("observacoes"),
  criadoEm: text("criado_em").notNull().default(agora()),
  criadoPor: text("criado_por").references(() => usuarios.id),
});

/* ------------------------------------------------------------------ */
/* Orçamentos                                                          */
/* ------------------------------------------------------------------ */

export const orcamentoStatus = [
  "rascunho",
  "enviado",
  "aprovado",
  "recusado",
  "convertido", // virou contrato
  "vencido",
] as const;
export type OrcamentoStatus = (typeof orcamentoStatus)[number];

/** Item do orçamento. Guardado como JSON para o documento ser renderizado igual. */
export type OrcamentoItem = {
  descricao: string;
  quantidade: number;
  /** Centavos por unidade. */
  valorUnitario: number;
};

export const orcamentos = sqliteTable("orcamentos", {
  id: text("id").primaryKey(),
  clienteId: text("cliente_id")
    .notNull()
    .references(() => clientes.id),
  demandaId: text("demanda_id").references(() => demandas.id),
  numero: text("numero").notNull(),
  titulo: text("titulo").notNull(),
  status: text("status", { enum: orcamentoStatus })
    .notNull()
    .default("rascunho"),

  itens: text("itens", { mode: "json" }).$type<OrcamentoItem[]>().notNull(),

  subtotal: centavos("subtotal"),
  /** Desconto em centavos — é o "meu desconto" que a Layane mencionou. */
  descontoValor: centavos("desconto_valor"),
  /** Desconto adicional em % (aplicado sobre o subtotal, antes do valor fixo). */
  descontoPercentual: integer("desconto_percentual").notNull().default(0),
  total: centavos("total"),

  condicaoPagamento: text("condicao_pagamento"),
  prazoEntrega: text("prazo_entrega"),
  validadeDias: integer("validade_dias").notNull().default(15),
  validoAte: data("valido_ate"),
  observacoes: text("observacoes"),

  enviadoEm: text("enviado_em"),
  aprovadoEm: text("aprovado_em"),

  criadoEm: text("criado_em").notNull().default(agora()),
  atualizadoEm: text("atualizado_em").notNull().default(agora()),
  criadoPor: text("criado_por").references(() => usuarios.id),
});

/* ------------------------------------------------------------------ */
/* Contratos                                                           */
/* ------------------------------------------------------------------ */

export const contratoStatus = [
  "rascunho",
  "enviado",
  "assinado",
  "ativo",
  "suspenso",
  "encerrado",
] as const;
export type ContratoStatus = (typeof contratoStatus)[number];

export const contratos = sqliteTable("contratos", {
  id: text("id").primaryKey(),
  clienteId: text("cliente_id")
    .notNull()
    .references(() => clientes.id),
  orcamentoId: text("orcamento_id").references(() => orcamentos.id),
  demandaId: text("demanda_id").references(() => demandas.id),
  numero: text("numero").notNull(),
  titulo: text("titulo").notNull(),
  status: text("status", { enum: contratoStatus })
    .notNull()
    .default("rascunho"),

  inicio: data("inicio"),
  fim: data("fim"),
  valorTotal: centavos("valor_total"),
  formaPagamento: text("forma_pagamento"),
  /** Nº de parcelas + intervalo — usado para gerar o cronograma. */
  parcelas: integer("parcelas").notNull().default(1),
  intervaloParcelasDias: integer("intervalo_parcelas_dias").notNull().default(30),

  /** Texto que entra no corpo do contrato. */
  escopo: text("escopo"),
  investimento: text("investimento"),
  formaDePagamentoTexto: text("forma_de_pagamento_texto"),
  obrigacoes: text("obrigacoes"),
  confidencialidade: text("confidencialidade"),
  rescisao: text("rescisao"),
  observacoes: text("observacoes"),

  assinadoEm: data("assinado_em"),
  criadoEm: text("criado_em").notNull().default(agora()),
  atualizadoEm: text("atualizado_em").notNull().default(agora()),
  criadoPor: text("criado_por").references(() => usuarios.id),
});

/* ------------------------------------------------------------------ */
/* Financeiro                                                          */
/* ------------------------------------------------------------------ */

export const formaPagamento = [
  "pix",
  "boleto",
  "transferencia",
  "dinheiro",
  "cartao_credito",
  "cartao_debito",
  "cheque",
  "outro",
] as const;
export type FormaPagamento = (typeof formaPagamento)[number];

export const lancamentoStatus = [
  "pendente",
  "pago",
  "atrasado",
  "cancelado",
] as const;
export type LancamentoStatus = (typeof lancamentoStatus)[number];

/**
 * Uma linha do "o que tem a receber / o que entrou".
 * Todo valor gerado por contrato entra aqui como `pendente`; o pagamento é
 * registrado em `pagamentos` e muda o status aqui. Desconto dado no meio do
 * caminho vira um `pagamento` negativo do tipo `desconto` — assim o histórico
 * não mente sobre o que foi realmente cobrado.
 */
export const lancamentos = sqliteTable("lancamentos", {
  id: text("id").primaryKey(),
  clienteId: text("cliente_id")
    .notNull()
    .references(() => clientes.id),
  contratoId: text("contrato_id").references(() => contratos.id),
  demandaId: text("demanda_id").references(() => demandas.id),

  descricao: text("descricao").notNull(),
  /** Centavos. Sempre positivo aqui — sinal vem do `pagamento`. */
  valor: centavos("valor"),
  vencimento: data("vencimento"),
  status: text("status", { enum: lancamentoStatus })
    .notNull()
    .default("pendente"),
  formaPagamento: text("forma_pagamento", {
    enum: formaPagamento,
  }).$type<FormaPagamento>(),
  pagoEm: data("pago_em"),
  /** Valor efetivamente recebido, se tiver sido parcial ou com desconto. */
  valorRecebido: centavos("valor_recebido"),
  numero: text("numero"),
  observacoes: text("observacoes"),

  criadoEm: text("criado_em").notNull().default(agora()),
  criadoPor: text("criado_por").references(() => usuarios.id),
});

/** Baixa de um lançamento. `desconto` entra como valor negativo. */
export const pagamentos = sqliteTable("pagamentos", {
  id: text("id").primaryKey(),
  lancamentoId: text("lancamento_id")
    .notNull()
    .references(() => lancamentos.id),
  clienteId: text("cliente_id")
    .notNull()
    .references(() => clientes.id),
  data: data("data").notNull(),
  /** Centavos. Negativo apenas para `desconto`/`estorno`. */
  valor: centavos("valor"),
  formaPagamento: text("forma_pagamento", {
    enum: formaPagamento,
  })
    .notNull()
    .default("pix"),
  tipo: text("tipo", { enum: ["pagamento", "desconto", "estorno"] })
    .notNull()
    .default("pagamento"),
  observacoes: text("observacoes"),
  criadoEm: text("criado_em").notNull().default(agora()),
  criadoPor: text("criado_por").references(() => usuarios.id),
});

/** Despesas da operação — o "quanto entrou e quanto saiu" completo. */
export const despesas = sqliteTable("despesas", {
  id: text("id").primaryKey(),
  descricao: text("descricao").notNull(),
  categoria: text("categoria"),
  valor: centavos("valor"),
  data: data("data").notNull(),
  formaPagamento: text("forma_pagamento", {
    enum: formaPagamento,
  })
    .notNull()
    .default("pix"),
  observacoes: text("observacoes"),
  criadoEm: text("criado_em").notNull().default(agora()),
  criadoPor: text("criado_por").references(() => usuarios.id),
});

/* ------------------------------------------------------------------ */
/* Relatório de conformidade                                           */
/* ------------------------------------------------------------------ */

export const conformidadeStatus = [
  "rascunho",
  "em_resposta",
  "emitido",
  "enviado",
] as const;
export type ConformidadeStatus = (typeof conformidadeStatus)[number];

/** Resposta de uma pergunta. */
export type Resposta = {
  /** `sim` | `nao` | `parcial` | `nao_aplicavel` | `nao_avaliado` */
  resposta: string;
  /** Evidência (número do documento, foto, laudo). */
  evidencia?: string;
  observacao?: string;
};

export type Pergunta = {
  id: string;
  /** Agrupador do questionário — vira a seção do relatório. */
  bloco?: string;
  pergunta: string;
  /** Orientação mostrada abaixo da pergunta. */
  ajuda?: string;
  /** Referência legal, se houver (CONAMA, Lei, norma). */
  referencia?: string;
  /** Gravidade quando a resposta for `nao`. Alimenta o parecer final. */
  criticidade: "baixa" | "media" | "alta";
  /** Quando marcado, o parecer final exige uma ação para este item. */
  exigeAcao: boolean;
  /** Puxa a resposta a partir de um documento do cliente. */
  documentoVinculado?: boolean;
};

export type ModeloConformidade = {
  versao: string;
  titulo: string;
  subtitulo?: string;
  introducao?: string;
  perguntas: Pergunta[];
  /** Rodapé do parecer: quem assina, cargo, registro. */
  assinatura?: {
    nome: string;
    cargo: string;
    registro?: string;
  };
};

/** Modelo de questionário — a Layane cria/edita quantos quiser. */
export const modelosConformidade = sqliteTable("modelos_conformidade", {
  id: text("id").primaryKey(),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  /** Versão do questionário (ex.: "2026.1") — permite histórico. */
  versao: text("versao").notNull().default("1.0"),
  modelo: text("modelo", { mode: "json" })
    .$type<ModeloConformidade>()
    .notNull(),
  ativo: integer("ativo", { mode: "boolean" }).notNull().default(true),
  criadoEm: text("criado_em").notNull().default(agora()),
  atualizadoEm: text("atualizado_em").notNull().default(agora()),
  criadoPor: text("criado_por").references(() => usuarios.id),
});

/** Uma aplicação do questionário a um cliente. */
export const analisesConformidade = sqliteTable("analises_conformidade", {
  id: text("id").primaryKey(),
  clienteId: text("cliente_id")
    .notNull()
    .references(() => clientes.id),
  modeloId: text("modelo_id")
    .notNull()
    .references(() => modelosConformidade.id),
  titulo: text("titulo").notNull(),
  status: text("status", { enum: conformidadeStatus })
    .notNull()
    .default("rascunho"),
  /** Mapa `idDaPergunta -> Resposta`. */
  respostas: text("respostas", { mode: "json" })
    .$type<Record<string, Resposta>>()
    .notNull()
    .default({}),
  /** Snapshot do modelo no momento da emissão — o parecer não muda depois. */
  modeloAplicado: text("modelo_aplicado", { mode: "json" }).$type<ModeloConformidade>(),
  /** Conclusão escrita pela Layane, que entra no parecer. */
  parecer: text("parecer"),
  /** Recomendações practices, uma por linha. */
  recomendacoes: text("recomendacoes"),
  /** Índice calculado no momento da emissão (0–100). */
  indiceConformidade: integer("indice_conformidade"),
  emitidoEm: text("emitido_em"),
  criadoEm: text("criado_em").notNull().default(agora()),
  atualizadoEm: text("atualizado_em").notNull().default(agora()),
  criadoPor: text("criado_por").references(() => usuarios.id),
});

/* ------------------------------------------------------------------ */
/* Configurações / auditoria                                           */
/* ------------------------------------------------------------------ */

export const configuracoes = sqliteTable("configuracoes", {
  chave: text("chave").primaryKey(),
  valor: text("valor"),
  atualizadoEm: text("atualizado_em").notNull().default(agora()),
});

/** Trilha de auditoria — quem mexeu em quê. */
export const auditoria = sqliteTable("auditoria", {
  id: text("id").primaryKey(),
  usuarioId: text("usuario_id").references(() => usuarios.id),
  acao: text("acao").notNull(),
  entidade: text("entidade").notNull(),
  entidadeId: text("entidade_id"),
  detalhe: text("detalhe"),
  criadoEm: text("criado_em").notNull().default(agora()),
});

/* ------------------------------------------------------------------ */
/* Tipos de linha                                                      */
/* ------------------------------------------------------------------ */

export type Usuario = InferSelectModel<typeof usuarios>;
export type Sessao = InferSelectModel<typeof sessoes>;
export type Cliente = InferSelectModel<typeof clientes>;
export type Servico = InferSelectModel<typeof servicos>;
export type Demanda = InferSelectModel<typeof demandas>;
export type Atendimento = InferSelectModel<typeof atendimentos>;
export type Documento = InferSelectModel<typeof documentos>;
export type Orcamento = InferSelectModel<typeof orcamentos>;
export type Contrato = InferSelectModel<typeof contratos>;
export type Lancamento = InferSelectModel<typeof lancamentos>;
export type Pagamento = InferSelectModel<typeof pagamentos>;
export type Despesa = InferSelectModel<typeof despesas>;
export type ModeloConformidadeRow = InferSelectModel<typeof modelosConformidade>;
export type AnaliseConformidade = InferSelectModel<typeof analisesConformidade>;

/* ------------------------------------------------------------------ */
/* Rótulos (traduzir enums para a UI)                                  */
/* ------------------------------------------------------------------ */

export const rotulosStatusCliente: Record<ClienteStatus, string> = {
  potencial: "Potencial",
  ativo: "Ativo",
  inativo: "Inativo",
  arquivado: "Arquivado",
};

export const rotulosStatusDemanda: Record<DemandaStatus, string> = {
  consulta: "Consulta",
  diagnostico: "Diagnóstico",
  proposta: "Proposta",
  contrato: "Contrato",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

/** Ordem do funil — usada no painel. */
export const funilOrdem: DemandaStatus[] = [
  "consulta",
  "diagnostico",
  "proposta",
  "contrato",
  "em_andamento",
  "concluido",
];

export const rotulosTipoAtendimento: Record<AtendimentoTipo, string> = {
  consulta: "Consulta",
  telefone: "Telefone",
  whatsapp: "WhatsApp",
  email: "E-mail",
  reuniao: "Reunião",
  visita_tecnica: "Visita técnica",
  envio_documento: "Envio de documento",
  cobranca: "Cobrança",
  outro: "Outro",
};

export const rotulosStatusOrcamento: Record<OrcamentoStatus, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aprovado: "Aprovado",
  recusado: "Recusado",
  convertido: "Convertido em contrato",
  vencido: "Vencido",
};

export const rotulosStatusContrato: Record<ContratoStatus, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  assinado: "Assinado",
  ativo: "Ativo",
  suspenso: "Suspenso",
  encerrado: "Encerrado",
};

export const rotulosFormaPagamento: Record<FormaPagamento, string> = {
  pix: "Pix",
  boleto: "Boleto",
  transferencia: "Transferência",
  dinheiro: "Dinheiro",
  cartao_credito: "Cartão de crédito",
  cartao_debito: "Cartão de débito",
  cheque: "Cheque",
  outro: "Outro",
};

export const rotulosStatusConformidade: Record<ConformidadeStatus, string> = {
  rascunho: "Rascunho",
  em_resposta: "Em resposta",
  emitido: "Emitido",
  enviado: "Enviado",
};

/** Rótulos de resposta do questionário de conformidade. */
export const rotulosResposta: Record<string, string> = {
  sim: "Conforme",
  parcial: "Parcialmente conforme",
  nao: "Não conforme",
  nao_aplicavel: "Não se aplica",
  nao_avaliado: "Não avaliado",
};

/**
 * Respostas que contam como conforme no índice.
 * `nao_aplicavel` e `nao_avaliado` saem da média (não contam nem contra).
 */
export const pesoResposta: Record<string, number | null> = {
  sim: 1,
  parcial: 0.5,
  nao: 0,
  nao_aplicavel: null,
  nao_avaliado: null,
};