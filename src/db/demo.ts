/**
 * Dados de demonstração.
 *
 * O `seed` cria só estrutura — 2 acessos, catálogo e questionário — e
 * isso é proposital: num sistema que vai guardar dado real de cliente,
 * inventar cliente e valor no seed é o caminho mais curto para alguém
 * confundir dado de mentira com dado de verdade.
 *
 * Este script é a exceção controlada. Fica FORA do `setup`, roda só
 * quando alguém pede, e avisa no fim o que ele criou — para nunca
 * aparecer números inventados num relatório que a Layane vai mostrar
 * para o cliente dela.
 *
 *     npm run db:demo        cria o conjunto
 *     npm run db:demo:limpa  apaga tudo que este script criou
 */

import { eq, inArray } from "drizzle-orm";

import { db } from "./index";
import {
  analisesConformidade,
  atendimentos,
  auditoria,
  clientes,
  contratos,
  demandas,
  despesas,
  documentos,
  lancamentos,
  modelosConformidade,
  orcamentos,
  pagamentos,
  servicos,
  sessoes,
  usuarios,
} from "./schema";
import { hoje, somaDias } from "../lib/dates";
import { novoId } from "../lib/ids";

async function main() {
  if (process.argv[2] === "--limpar") return limpar();

  const [layane] = await db
    .select()
    .from(usuarios)
    .where(eq(usuarios.email, "layane@layanemarques.com.br"))
    .limit(1);

  if (!layane) {
    throw new Error(
      "Rode `npm run setup` antes — o demo usa o acesso da Layane como dono dos registros.",
    );
  }

  const catalogo = await db.select().from(servicos).limit(8);
  if (!catalogo.length) {
    throw new Error("Catálogo de serviços vazio. Rode `npm run setup` antes.");
  }

  const autor = layane.id;
  const hj = hoje();
  /** `d(-30)` = trinta dias atrás. */
  const d = (n: number) => somaDias(hj, n);
  const ano = new Date().getFullYear();

  console.log(`→ montando dados de demonstração (referência: ${hj})`);

  /* ------------------------------------------------------------------ */
  /* Clientes                                                            */
  /* ------------------------------------------------------------------ */

  const prefeitura = {
    id: novoId("cli"),
    nome: "Prefeitura Municipal de São Raimundo Nonato",
    cnpj: "06517830000140",
    setorPublico: true,
    contatoNome: "Dra. Marlene Costa",
    contatoCargo: "Secretária de Meio Ambiente",
    contatoEmail: "marlene.costa@srn.pi.gov.br",
    contatoTelefone: "(89) 99912-4477",
    whatsapp: "89999124477",
    segmento: "Órgão público municipal",
    porte: "Médio",
    endereco: "Praça da Matriz, 12 — Centro",
    cidade: "São Raimundo Nonato",
    uf: "PI",
    status: "ativo" as const,
    origem: "Indicação",
    observacoes: "Contrato anual de gestão ambiental. Renovação vence no semestre.",
    criadoEm: d(-320),
    atualizadoEm: d(-30),
    criadoPor: autor,
  };

  const cooperativa = {
    id: novoId("cli"),
    nome: "Cooperativa Agroindustrial do Agreste",
    cnpj: "04781266000108",
    contatoNome: "Joelson Lima",
    contatoCargo: "Gerente administrativo",
    contatoEmail: "joelson@cooperativaagreste.pi.br",
    whatsapp: "89988001122",
    segmento: "Agroindústria",
    porte: "Médio",
    endereco: "Rod. PI-045, km 4",
    cidade: "Barras",
    uf: "PI",
    status: "ativo" as const,
    origem: "Site",
    observacoes: "Paga em dia. Exige laudo mensal de resíduos.",
    criadoEm: d(-210),
    atualizadoEm: d(-40),
    criadoPor: autor,
  };

  const zelao = {
    id: novoId("cli"),
    nome: "Zelão Empreendimentos Imobiliários",
    cnpj: "31277888000151",
    contatoNome: "Rafael Zelão",
    contatoEmail: "rafael@zelaoimoveis.com.br",
    whatsapp: "89991230099",
    segmento: "Construção civil",
    porte: "Pequeno",
    cidade: "Parnaíba",
    uf: "PI",
    status: "ativo" as const,
    origem: "Indicação",
    criadoEm: d(-140),
    atualizadoEm: d(-10),
    criadoPor: autor,
  };

  const usina = {
    id: novoId("cli"),
    nome: "Usina Santa Luzia Energias Renováveis",
    cnpj: "29476510000103",
    contatoNome: "Eng. Paulo Henrique Sato",
    contatoCargo: "Gerente de Sustentabilidade",
    contatoEmail: "phsato@usinaluzia.energia.br",
    contatoTelefone: "(61) 99811-2233",
    whatsapp: "61998112233",
    segmento: "Energia renovável",
    porte: "Grande",
    cidade: "José de Freitas",
    uf: "PI",
    status: "ativo" as const,
    origem: "Site",
    observacoes: "Licenciamento em andamento. Prazo apertado — projeto com 90 dias.",
    criadoEm: d(-95),
    atualizadoEm: d(-18),
    criadoPor: autor,
  };

  const padaria = {
    id: novoId("cli"),
    nome: "Padaria Pão do Cerrado",
    cnpj: "22550133000177",
    contatoNome: "Antônio Carlos",
    contatoEmail: "contato@paodocerrado.com.br",
    whatsapp: "89996332211",
    segmento: "Alimentício",
    porte: "Pequeno",
    cidade: "Floriano",
    uf: "PI",
    status: "inativo" as const,
    origem: "Indicação",
    observacoes: "Sem movimento desde o ano passado. Não apagar — tem histórico.",
    criadoEm: d(-400),
    atualizadoEm: d(-200),
    criadoPor: autor,
  };

  const sitio = {
    id: novoId("cli"),
    nome: "Sítio Boa Esperança",
    cpf: "12345678909",
    contatoNome: "Antônio de Sousa",
    contatoEmail: "sitioboaesperanca@email.com",
    whatsapp: "89995556677",
    segmento: "Agronegócio",
    porte: "Pequeno",
    cidade: "São Raimundo Nonato",
    uf: "PI",
    status: "potencial" as const,
    origem: "Site",
    observacoes: "Veio pelo formulário do site. Ainda sem conversa.",
    criadoEm: d(-12),
    atualizadoEm: d(-12),
    criadoPor: autor,
  };

  await db.insert(clientes).values([prefeitura, cooperativa, zelao, usina, padaria, sitio]);
  console.log("  6 clientes (3 ativos, 1 potencial, 1 inativo, 1 sem conversa)");

  /* ------------------------------------------------------------------ */
  /* Demandas — o funil em fases diferentes                               */
  /* ------------------------------------------------------------------ */

  const licenca = {
    id: novoId("dem"),
    clienteId: prefeitura.id,
    titulo: "Renovação da Licença de Operação",
    servicoId: catalogo[0]?.id,
    descricao:
      "Requerimento de renovação junto ao órgão estadual, com atualização do inventário de resíduos.",
    status: "em_andamento" as const,
    valorEstimado: 480_000,
    probabilidade: 85,
    prazoDias: 90,
    dataAbertura: d(-60),
    responsavelId: autor,
    criadoEm: d(-60),
    atualizadoEm: d(-30),
    criadoPor: autor,
  };

  await db.insert(demandas).values([
    licenca,
    {
      id: novoId("dem"),
      clienteId: cooperativa.id,
      titulo: "Plano de Gerenciamento de Resíduos Sólidos",
      servicoId: catalogo[1]?.id,
      status: "concluido" as const,
      valorEstimado: 320_000,
      probabilidade: 100,
      prazoDias: 45,
      dataAbertura: d(-120),
      dataFechamento: d(-35),
      responsavelId: autor,
      criadoEm: d(-120),
      atualizadoEm: d(-35),
      criadoPor: autor,
    },
    {
      id: novoId("dem"),
      clienteId: zelao.id,
      titulo: "AVCB para obra residencial",
      servicoId: catalogo[2]?.id,
      descricao:
        "Projeto de AVCB para três torres — análise de sistema de combate a incêndio.",
      status: "proposta" as const,
      valorEstimado: 600_000,
      probabilidade: 55,
      prazoDias: 40,
      dataAbertura: d(-25),
      responsavelId: autor,
      criadoEm: d(-25),
      atualizadoEm: d(-10),
      criadoPor: autor,
    },
    {
      id: novoId("dem"),
      clienteId: usina.id,
      titulo: "Laudo trimestral de resíduos sólidos",
      servicoId: catalogo[3]?.id,
      descricao: "Contrato recorrente — três laudos por ano.",
      status: "em_andamento" as const,
      valorEstimado: 270_000,
      probabilidade: 90,
      prazoDias: 30,
      dataAbertura: d(-40),
      responsavelId: autor,
      criadoEm: d(-40),
      atualizadoEm: d(-18),
      criadoPor: autor,
    },
    {
      id: novoId("dem"),
      clienteId: sitio.id,
      titulo: "Diagnóstico de passivo em área rural",
      descricao: "Primeiro contato. Ainda não sabe o que precisa.",
      status: "consulta" as const,
      valorEstimado: 150_000,
      probabilidade: 20,
      dataAbertura: d(-12),
      responsavelId: autor,
      criadoEm: d(-12),
      atualizadoEm: d(-12),
      criadoPor: autor,
    },
  ]);
  console.log("  5 demandas (consulta, proposta, duas em andamento, uma concluída)");

  /* ------------------------------------------------------------------ */
  /* Histórico de atendimento                                            */
  /* ------------------------------------------------------------------ */

  await db.insert(atendimentos).values([
    {
      id: novoId("atd"),
      clienteId: prefeitura.id,
      demandaId: licenca.id,
      data: d(-58),
      tipo: "visita_tecnica" as const,
      titulo: "Vistoria para renovação da licença",
      resumo:
        "Visita à sede. Inventário de resíduos atualizado; dois resíduos novos entraram no plano.",
      proximoPasso: "Montar o requerimento e protocolar",
      dataProximoPasso: d(-40),
      duracaoMin: 180,
      criadoPor: autor,
    },
    {
      id: novoId("atd"),
      clienteId: prefeitura.id,
      demandaId: licenca.id,
      data: d(-30),
      tipo: "email" as const,
      titulo: "Protocolo deferido parcialmente",
      resumo: "Órgão pediu complementação do inventário. Responder até a data combinada.",
      proximoPasso: "Enviar complementação",
      dataProximoPasso: d(-8),
      criadoPor: autor,
    },
    {
      id: novoId("atd"),
      clienteId: cooperativa.id,
      data: d(-40),
      tipo: "reuniao" as const,
      titulo: "Apresentação do PGRSS à diretoria",
      resumo: "Aprovado sem ressalvas. Assinatura na semana seguinte.",
      duracaoMin: 90,
      criadoPor: autor,
    },
    {
      id: novoId("atd"),
      clienteId: usina.id,
      data: d(-18),
      tipo: "whatsapp" as const,
      titulo: "Pedido de laudo antecipado",
      resumo: "Auditoria externa marcada para o dia 20 — pediu o laudo dois dias antes.",
      proximoPasso: "Enviar laudo de percentual de destinação",
      dataProximoPasso: d(2),
      criadoPor: autor,
    },
    {
      id: novoId("atd"),
      clienteId: sitio.id,
      data: d(-12),
      tipo: "consulta" as const,
      titulo: "Primeiro contato pelo site",
      resumo: "Área de 40 hectares com passivo conhecido. Quer orçamento de diagnóstico.",
      proximoPasso: "Agendar visita técnica",
      dataProximoPasso: d(5),
      criadoPor: autor,
    },
  ]);
  console.log("  5 atendimentos, 4 com próximo passo marcado");

  /* ------------------------------------------------------------------ */
  /* Documentos — um vencido e um a vencer                                */
  /* ------------------------------------------------------------------ */

  await db.insert(documentos).values([
    {
      id: novoId("doc"),
      clienteId: prefeitura.id,
      nome: "Licença de Operação",
      tipo: "Licença",
      orgao: "Secretaria de Estado do Meio Ambiente",
      numero: "LO-2024-11882",
      emissao: d(-300),
      validade: d(38),
      status: "a_vencer" as const,
      observacoes: "Vence no fim do mês — já está em renovação.",
      criadoPor: autor,
    },
    {
      id: novoId("doc"),
      clienteId: cooperativa.id,
      nome: "Certificado de Rudimentos",
      tipo: "Certificado",
      orgao: "Corpo de Bombeiros",
      emissao: d(-380),
      validade: d(-12),
      status: "vencido" as const,
      observacoes: "Venceu. Cliente ainda não regularizou.",
      criadoPor: autor,
    },
    {
      id: novoId("doc"),
      clienteId: usina.id,
      nome: "Relatório de Impacto Ambiental",
      tipo: "Estudo",
      orgao: "IBAMA",
      emissao: d(-700),
      validade: d(200),
      status: "valido" as const,
      criadoPor: autor,
    },
    {
      id: novoId("doc"),
      clienteId: zelao.id,
      nome: "Alvará de construção",
      tipo: "Alvará",
      orgao: "Prefeitura de Parnaíba",
      emissao: d(-200),
      validade: d(160),
      status: "valido" as const,
      criadoPor: autor,
    },
  ]);
  console.log("  4 documentos (1 vencido, 1 a vencer, 2 válidos)");

  /* ------------------------------------------------------------------ */
  /* Orçamento enviado e contrato ativo                                   */
  /* ------------------------------------------------------------------ */

  const contratoId = novoId("ctr");

  await db.insert(orcamentos).values({
    id: novoId("orc"),
    clienteId: zelao.id,
    numero: `ORC-${ano}-0001`,
    titulo: "Projeto de AVCB — três torres",
    status: "enviado" as const,
    itens: [
      { descricao: "Análise de sistema de combate a incêndio", quantidade: 1, valorUnitario: 380_000 },
      { descricao: "Elaboração do projeto técnico", quantidade: 1, valorUnitario: 270_000 },
    ],
    subtotal: 650_000,
    descontoValor: 50_000,
    descontoPercentual: 0,
    total: 600_000,
    condicaoPagamento: "50% na assinatura, 50% na entrega",
    prazoEntrega: "40 dias",
    validadeDias: 15,
    validoAte: d(15),
    enviadoEm: d(-10),
    criadoEm: d(-12),
    atualizadoEm: d(-10),
    criadoPor: autor,
  });

  await db.insert(contratos).values({
    id: contratoId,
    clienteId: prefeitura.id,
    demandaId: licenca.id,
    numero: `CT-${ano}-0001`,
    titulo: "Gestão ambiental anual",
    status: "ativo" as const,
    inicio: d(-280),
    fim: d(85),
    valorTotal: 480_000,
    formaPagamento: "pix",
    parcelas: 4,
    intervaloParcelasDias: 90,
    escopo:
      "Gestão integral de resíduos sólidos, acompanhamento de licenciamento e relatórios periódicos.",
    investimento: "Quatro parcelas de R$ 1.200,00.",
    obrigacoes:
      "A Layane entrega relatórios mensais; a prefeitura fica responsável pelo descarte propriamente dito.",
    assinadoEm: d(-282),
    criadoEm: d(-285),
    atualizadoEm: d(-282),
    criadoPor: autor,
  });
  console.log("  1 orçamento enviado, 1 contrato ativo");

  /* ------------------------------------------------------------------ */
  /* Financeiro — pago, atrasado e a vencer                               */
  /* ------------------------------------------------------------------ */

  const parcela1 = novoId("lan");
  const parcela2 = novoId("lan");

  await db.insert(lancamentos).values([
    {
      id: parcela1,
      clienteId: prefeitura.id,
      contratoId,
      demandaId: licenca.id,
      descricao: "Parcela 1/4 — Gestão ambiental anual",
      valor: 120_000,
      vencimento: d(-210),
      status: "pago" as const,
      formaPagamento: "pix" as const,
      pagoEm: d(-208),
      valorRecebido: 120_000,
      criadoPor: autor,
    },
    {
      id: parcela2,
      clienteId: prefeitura.id,
      contratoId,
      demandaId: licenca.id,
      descricao: "Parcela 2/4 — Gestão ambiental anual",
      valor: 120_000,
      vencimento: d(-120),
      status: "pago" as const,
      formaPagamento: "pix" as const,
      pagoEm: d(-118),
      valorRecebido: 110_000,
      observacoes: "Desconto de R$ 100,00 concedido em reunião.",
      criadoPor: autor,
    },
    {
      id: novoId("lan"),
      clienteId: prefeitura.id,
      contratoId,
      demandaId: licenca.id,
      descricao: "Parcela 3/4 — Gestão ambiental anual",
      valor: 120_000,
      vencimento: d(-18),
      status: "pendente" as const,
      formaPagamento: "pix" as const,
      criadoPor: autor,
    },
    {
      id: novoId("lan"),
      clienteId: cooperativa.id,
      descricao: "PGRSS — parcela única",
      valor: 320_000,
      vencimento: d(25),
      status: "pendente" as const,
      criadoPor: autor,
    },
  ]);

  await db.insert(pagamentos).values([
    {
      id: novoId("pag"),
      lancamentoId: parcela1,
      clienteId: prefeitura.id,
      data: d(-208),
      valor: 120_000,
      formaPagamento: "pix" as const,
      criadoPor: autor,
    },
    {
      id: novoId("pag"),
      lancamentoId: parcela2,
      clienteId: prefeitura.id,
      data: d(-118),
      valor: 110_000,
      formaPagamento: "pix" as const,
      criadoPor: autor,
    },
    {
      id: novoId("pag"),
      lancamentoId: parcela2,
      clienteId: prefeitura.id,
      data: d(-118),
      valor: -10_000,
      formaPagamento: "pix" as const,
      tipo: "desconto" as const,
      observacoes: "Desconto comercial autorizado pela Layane.",
      criadoPor: autor,
    },
  ]);

  await db.insert(despesas).values([
    {
      id: novoId("des"),
      descricao: "Taxa de análise do órgão estadual",
      categoria: "Taxa",
      valor: 42_000,
      data: d(-45),
      formaPagamento: "pix" as const,
      criadoPor: autor,
    },
    {
      id: novoId("des"),
      descricao: "Deslocamento — vistoria em São Raimundo Nonato",
      categoria: "Transporte",
      valor: 18_500,
      data: d(-58),
      formaPagamento: "dinheiro" as const,
      criadoPor: autor,
    },
    {
      id: novoId("des"),
      descricao: "Assinatura de ferramenta de análise",
      categoria: "Software",
      valor: 12_900,
      data: d(-30),
      formaPagamento: "cartao_credito" as const,
      criadoPor: autor,
    },
  ]);
  console.log("  4 lançamentos (2 pagos, 1 atrasado, 1 a vencer), 3 despesas");

  /* ------------------------------------------------------------------ */
  /* Conformidade                                                        */
  /* ------------------------------------------------------------------ */

  const [modelo] = await db.select().from(modelosConformidade).limit(1);
  if (modelo) {
    await db.insert(analisesConformidade).values({
      id: novoId("ana"),
      clienteId: usina.id,
      modeloId: modelo.id,
      titulo: "Conformidade ambiental — usina",
      status: "em_resposta",
      indiceConformidade: 68,
      criadoPor: autor,
    });
    console.log("  1 análise de conformidade");
  }

  await db.insert(auditoria).values({
    id: novoId("aud"),
    usuarioId: autor,
    acao: "criar",
    entidade: "demo",
    detalhe: "dados de demonstração gerados",
  });

  console.log(`
✓ demonstração pronta.

  O painel abre com o funil em fases, o financeiro com parcela vencida
  e parcela paga, e documentos com um vencido e um a vencer — as três
  coisas que costumam aparecer vazias numa demo.

  ESTES DADOS SÃO INVENTADOS. Antes de mostrar número para o cliente
  dela, rode:

      npm run db:demo:limpa
`);
}

/** Apaga tudo que este script criou, sem tocar no seed. */
async function limpar() {
  console.log("→ removendo os dados de demonstração");

  const pag = (await db.select({ id: pagamentos.id }).from(pagamentos)).map((l) => l.id);
  const lan = (await db.select({ id: lancamentos.id }).from(lancamentos)).map((l) => l.id);
  const ctr = (await db.select({ id: contratos.id }).from(contratos)).map((l) => l.id);
  const ana = (await db.select({ id: analisesConformidade.id }).from(analisesConformidade)).map(
    (l) => l.id,
  );

  // Ordem inversa das dependências, senão a chave estrangeira reclama.
  if (pag.length) await db.delete(pagamentos).where(inArray(pagamentos.id, pag));
  if (lan.length) await db.delete(lancamentos).where(inArray(lancamentos.id, lan));
  if (ctr.length) await db.delete(contratos).where(inArray(contratos.id, ctr));
  if (ana.length)
    await db.delete(analisesConformidade).where(inArray(analisesConformidade.id, ana));

  await db.delete(auditoria).where(eq(auditoria.entidade, "demo"));
  await db.delete(despesas);
  await db.delete(documentos);
  await db.delete(atendimentos);
  await db.delete(demandas);
  await db.delete(orcamentos);
  await db.delete(clientes);
  await db.delete(sessoes);

  console.log("✓ limpo. O seed (acessos, catálogo, questionário) continua lá.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("✗ falha no demo:", err);
    process.exit(1);
  });