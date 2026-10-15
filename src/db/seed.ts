/**
 * Conteúdo inicial do sistema.
 *
 * Popula o que é ESTRUTURA, nunca dado inventado:
 * - os dois acessos (Layane e a assistente) — senha inicial trocada no 1º login;
 * - o catálogo de serviços, tirado das soluções que já existem no site;
 * - o questionário de conformidade padrão.
 *
 * Não cria clientes, contratos ou valores. Quem cadastra isso é a Layane.
 *
 * Executar com `npm run db:seed`.
 */

import bcrypt from "bcryptjs";
import { count, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  modelosConformidade,
  servicos,
  usuarios,
  type ModeloConformidade,
} from "@/db/schema";

import { novoId } from "../lib/ids";

/* ------------------------------------------------------------------ */
/* Usuários                                                            */
/* ------------------------------------------------------------------ */

/** Senha inicial. Trocar no primeiro acesso — o sistema avisa no painel. */
const SENHA_INICIAL = "layane2026";

const USUARIOS = [
  {
    nome: "Layane Marques",
    email: "layane@layanemarques.com.br",
    papel: "admin" as const,
    cargo: "Gestora ambiental",
  },
  {
    nome: "Assistente",
    email: "assistente@layanemarques.com.br",
    papel: "assistente" as const,
    cargo: "Administrativo",
  },
];

/* ------------------------------------------------------------------ */
/* Serviços                                                            */
/* ------------------------------------------------------------------ */

const SERVICOS = [
  {
    nome: "Licenciamento ambiental",
    descricao:
      "Suporte técnico para processos de licenciamento e regularização.",
    precoPadrao: 0,
    unidade: "projeto",
  },
  {
    nome: "Consultoria ambiental",
    descricao:
      "Orientação estratégica para demandas ambientais específicas, com acompanhamento.",
    precoPadrao: 0,
    unidade: "projeto",
  },
  {
    nome: "Diagnóstico de conformidade",
    descricao:
      "Levantamento de pendências, riscos e oportunidades de adequação, com relatório.",
    precoPadrao: 0,
    unidade: "projeto",
  },
  {
    nome: "Plano de Gerenciamento de Resíduos (PGRSS)",
    descricao:
      "Elaboração ou revisão do plano de gestão de resíduos sólidos, com registro no MNRB.",
    precoPadrao: 0,
    unidade: "projeto",
  },
  {
    nome: "Gestão ambiental mensal",
    descricao:
      "Acompanhamento contínuo: monitoramento, relatórios, atendimento a exigências.",
    precoPadrao: 0,
    unidade: "mensal",
  },
  {
    nome: "Treinamento ambiental",
    descricao:
      "Treinamento de equipe sobre resíduos, emergência e responsibilities ambientais.",
    precoPadrao: 0,
    unidade: "projeto",
  },
  {
    nome: "Outorga e uso de recursos hídricos",
    descricao:
      "Regularização de captação de água e/ou disciplina de efluentes junto ao órgão gestor.",
    precoPadrao: 0,
    unidade: "projeto",
  },
  {
    nome: "Assessoria técnica ao setor público",
    descricao:
      "Apoio técnico a municípios e órgãos públicos em demandas ambientais.",
    precoPadrao: 0,
    unidade: "projeto",
  },
];

/* ------------------------------------------------------------------ */
/* Questionário de conformidade                                       */
/* ------------------------------------------------------------------ */

/**
 * Roteiro padrão. Cada pergunta nasce de uma exigência real — a Layane
 * responde "não" e o relatório diz o que falta e por quê. É isso que
 * transforma o sistema em produto, não em formulário.
 *
 * A Layane edita e cria modelos próprios em Configurações.
 */
const MODELO_PADRAO: ModeloConformidade = {
  versao: "2026.1",
  titulo: "Diagnóstico de Conformidade Ambiental",
  subtitulo:
    "Avaliação da situação ambiental da organização frente às exigências aplicáveis.",
  introducao:
    "Este diagnóstico resulta do levantamento direto das condições da organização, " +
    "com base nas informações prestadas e nos documentos apresentados. Cada item " +
    "avaliado reflete a exigência legal aplicável à atividade exercida e o grau de " +
    "adequação encontrado na data de emissão. O objetivo é apontar o caminho mais " +
    "seguro para regularizar o que é irregular e manter o que já está conforme.",
  assinatura: {
    nome: "Layane Marques",
    cargo: "Gestora Ambiental",
    registro: "Gestão Ambiental Aplicada",
  },
  perguntas: [
    /* ---------------- 1. Licenciamento ---------------- */
    {
      id: "lic-01",
      bloco: "Licenciamento e autorizações",
      pergunta:
        "A organização possui licença ambiental vigente para a atividade exercida?",
      ajuda:
        "Licença de Instalação e/ou Operação, Autorização de Operação, ou a declaração de Isenção emitida pelo órgão competente.",
      referencia: "Lei 6.938/1981 · CONAMA 237/1997",
      criticidade: "alta",
      exigeAcao: true,
      documentoVinculado: true,
    },
    {
      id: "lic-02",
      bloco: "Licenciamento e autorizações",
      pergunta:
        "As condições da licença estão sendo cumpridas na operação real?",
      ajuda:
        "Volume, prazo, horário, pontos de controle e limitações previstos no ato autorizativo.",
      referencia: "Condicionantes da licença",
      criticidade: "alta",
      exigeAcao: true,
    },
    {
      id: "lic-03",
      bloco: "Licenciamento e autorizações",
      pergunta:
        "Existe estudo de impacto ambiental (EIA/RIMA) quando a atividade está em risco?",
      ajuda:
        "O EIA/RIMA é exigível para atividades de alto risco, conforme o anexo XIV da Lei 6.938/1981.",
      referencia: "Lei 6.938/1981, art. 14, §1º · CONAMA 237/1997, art. 3º",
      criticidade: "alta",
      exigeAcao: true,
    },
    {
      id: "lic-04",
      bloco: "Licenciamento e autorizações",
      pergunta:
        "A licença fica disponível e acessível para apresentação em fiscalização ou auditoria?",
      referencia: "Decreto 6.514/2008",
      criticidade: "media",
      exigeAcao: false,
      documentoVinculado: true,
    },

    /* ---------------- 2. Resíduos ---------------- */
    {
      id: "res-01",
      bloco: "Resíduos sólidos",
      pergunta:
        "Existe plano de gerenciamento de resíduos sólidos (PGRSS) compatível com a operação?",
      ajuda:
        "O plano deve refletir os resíduos realmente gerados, não um modelo genérico.",
      referencia: "Lei 12.305/2010, art. 36 · NR-01",
      criticidade: "alta",
      exigeAcao: true,
      documentoVinculado: true,
    },
    {
      id: "res-02",
      bloco: "Resíduos sólidos",
      pergunta:
        "Os resíduos estão sendo classificados corretamente, com separação na origem?",
      ajuda:
        "Resíduos comuns, reutilizáveis, orgânicos e perigosos devem ser segregados antes do armazenamento.",
      referencia: "Lei 12.305/2010, art. 9º",
      criticidade: "media",
      exigeAcao: true,
    },
    {
      id: "res-03",
      bloco: "Resíduos sólidos",
      pergunta:
        "O armazenamento temporário respeita os prazos e as condições exigidas?",
      ajuda:
        "O armazenamento de resíduos perigosos não pode ultrapassar o prazo legal, com Containers adequados.",
      referencia: "Lei 12.305/2010, art. 21 · NR-01",
      criticidade: "alta",
      exigeAcao: true,
    },
    {
      id: "res-04",
      bloco: "Resíduos sólidos",
      pergunta:
        "A destinação final é feita por operadores licenciados, com comprovantes arquivados?",
      ajuda:
        "MTR ( Manifesto de Transporte de Resíduos) deve acompanhar cada movimentação.",
      referencia: "Lei 12.305/2010, art. 13",
      criticidade: "alta",
      exigeAcao: true,
      documentoVinculado: true,
    },
    {
      id: "res-05",
      bloco: "Resíduos sólidos",
      pergunta:
        "O registro no MNRB (Inventário Nacional de Resíduos) está em dia?",
      referencia: "Lei 12.305/2010, art. 39",
      criticidade: "media",
      exigeAcao: true,
    },

    /* ---------------- 3. Resíduos perigosos ---------------- */
    {
      id: "rp-01",
      bloco: "Resíduos perigosos",
      pergunta:
        "Os resíduos perigosos estão identificados e armazenados em área específica?",
      ajuda: "Sinalização, container compatível, acesso restrito e proteção contra chuva.",
      referencia: "Lei 12.305/2010, art. 17 · NR-01",
      criticidade: "alta",
      exigeAcao: true,
    },
    {
      id: "rp-02",
      bloco: "Resíduos perigosos",
      pergunta:
        "Existe controle de geração e registro de todos os resíduos perigosos?",
      ajuda:
        "Planilha ou sistema com tipo, quantidade, data e destinação — base para o relatório MNRB.",
      referencia: "Lei 12.305/2010, art. 13, VII",
      criticidade: "media",
      exigeAcao: true,
    },
    {
      id: "rp-03",
      bloco: "Resíduos perigosos",
      pergunta:
        "Os resíduos de saúde (RSS), quando houver, são gerenciados por operador licenciado?",
      referencia: "RDC 36/2013 · NRB 36",
      criticidade: "alta",
      exigeAcao: true,
    },

    /* ---------------- 4. Água ---------------- */
    {
      id: "agua-01",
      bloco: "Recursos hídricos",
      pergunta:
        "Há outorga de direito de uso de água para o consumo ou captação da organização?",
      referencia: "Lei 9.433/1997",
      criticidade: "alta",
      exigeAcao: true,
      documentoVinculado: true,
    },
    {
      id: "agua-02",
      bloco: "Recursos hídricos",
      pergunta:
        "Os efluentes são tratados e descartados conforme a outorga ou a licença?",
      referencia: "Lei 9.433/1997, art. 12 · CONAMA 357/2005",
      criticidade: "alta",
      exigeAcao: true,
    },
    {
      id: "agua-03",
      bloco: "Recursos hídricos",
      pergunta:
        "O consumo de água é monitorizado e registrado periodicamente?",
      referencia: "Lei 9.433/1997, art. 15",
      criticidade: "baixa",
      exigeAcao: false,
    },

    /* ---------------- 5. Solo e área ---------------- */
    {
      id: "area-01",
      bloco: "Área e solo",
      pergunta:
        "A organização está instalada fora de Área de Preservação Permanente e de Reserva Legal?",
      ajuda:
        "Verificar camada do solo, uso do terreno e qualquer ocupação de APP.",
      referencia: "Lei 12.651/2012 · Código Florestal",
      criticidade: "alta",
      exigeAcao: true,
    },
    {
      id: "area-02",
      bloco: "Área e solo",
      pergunta:
        "O CAR da propriedade está registrado e atualizado?",
      referencia: "Lei 12.651/2012, art. 29",
      criticidade: "media",
      exigeAcao: true,
    },
    {
      id: "area-03",
      bloco: "Área e solo",
      pergunta:
        "Existe investigação de qualidade do solo e de áreas contaminadas?",
      ajuda:
        "Obrigatória quando há atividade de risco ou passivo ambiental conhecido.",
      referencia: "CONAMA 303/2002 · Lei 10.603/2002",
      criticidade: "media",
      exigeAcao: true,
    },

    /* ---------------- 6. Emissões e ruído ---------------- */
    {
      id: "emis-01",
      bloco: "Emissões e ruído",
      pergunta:
        "As emissões atmosféricas estão dentro dos limites e com o registro de manutenção dos sistemas?",
      referencia: "CONAMA 03/1990 · NBR 10052",
      criticidade: "media",
      exigeAcao: true,
      documentoVinculado: true,
    },
    {
      id: "emis-02",
      bloco: "Emissões e ruído",
      pergunta:
        "A operação respeita os limites de ruído para os vizinhos?",
      referencia: "CONAMA 03/1990 · NBR 10152/10151",
      criticidade: "baixa",
      exigeAcao: false,
    },

    /* ---------------- 7. Responsabilidade ---------------- */
    {
      id: "resp-01",
      bloco: "Responsabilidade ambiental",
      pergunta:
        "A organização tem conhecimento das responsabilidades penais ambientais aplicáveis?",
      ajuda:
        "Responsabilidade objetiva da pessoa jurídica, nos termos do art. 2º da Lei 9.605/1998.",
      referencia: "Lei 9.605/1998 · Lei 9.605, art. 2º",
      criticidade: "media",
      exigeAcao: false,
    },
    {
      id: "resp-02",
      bloco: "Responsabilidade ambiental",
      pergunta:
        "Existe seguro ambiental ou provisionamento para o passivo de longo prazo?",
      ajuda:
        "A responsabilidade ambiental é de longo prazo e não se extingue com o fim da atividade.",
      referencia: "Lei 6.938/1981, art. 14, §1º",
      criticidade: "baixa",
      exigeAcao: false,
    },
    {
      id: "resp-03",
      bloco: "Responsabilidade ambiental",
      pergunta:
        "Há um responsável técnico formalmente designado para os assuntos ambientais?",
      referencia: "ISO 14001 · requisitos de competência",
      criticidade: "media",
      exigeAcao: true,
    },

    /* ---------------- 8. Emergência ---------------- */
    {
      id: "emer-01",
      bloco: "Emergências",
      pergunta:
        "Existe plano de resposta a emergencies ambientais (acidente, vazamento, incêndio)?",
      ajuda:
        "O plano precisa indicar ações, responsáveis, comunicação aos órgãos e recursos disponíveis.",
      referencia: "Lei 6.938/1981 · NR-23 (transversal)",
      criticidade: "media",
      exigeAcao: true,
      documentoVinculado: true,
    },
    {
      id: "emer-02",
      bloco: "Emergências",
      pergunta:
        "Os recursos de emergência (contenção, EPI, extintor) estão presentes e dentro da validade?",
      referencia: "NR-12 / NR-23",
      criticidade: "baixa",
      exigeAcao: false,
    },

    /* ---------------- 9. People ---------------- */
    {
      id: "pess-01",
      bloco: "Pessoas e educação",
      pergunta:
        "A equipe foi treinada nas práticas ambientais e nos procedimentos da organização?",
      referencia: "NR-01 · NR-18 (transversal)",
      criticidade: "baixa",
      exigeAcao: false,
    },
    {
      id: "pess-02",
      bloco: "Pessoas e educação",
      pergunta:
        "A organização promove ações de educação ambiental (Lei 9.795/1999)?",
      referencia: "Lei 9.795/1999, art. 12",
      criticidade: "baixa",
      exigeAcao: false,
    },

    /* ---------------- 10. Gestão ---------------- */
    {
      id: "gest-01",
      bloco: "Sistema de gestão",
      pergunta:
        "Existe política ambiental formalizada e conhecida pela equipe?",
      referencia: "ISO 14001",
      criticidade: "baixa",
      exigeAcao: false,
    },
    {
      id: "gest-02",
      bloco: "Sistema de gestão",
      pergunta:
        "Há metas ambientais com acompanhamento periódico?",
      referencia: "ISO 14001",
      criticidade: "baixa",
      exigeAcao: false,
    },
    {
      id: "gest-03",
      bloco: "Sistema de gestão",
      pergunta:
        "As não conformidades anteriores estão sendo tratadas e registradas?",
      referencia: "Ciclo PDCA",
      criticidade: "media",
      exigeAcao: false,
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Execução                                                            */
/* ------------------------------------------------------------------ */

async function main() {
  const hash = await bcrypt.hash(SENHA_INICIAL, 12);

  /* Usuários — só cria se a tabela estiver vazia. */
  const [total] = await db.select({ n: count() }).from(usuarios);
  if (!total?.n) {
    await db.insert(usuarios).values(
      USUARIOS.map((u) => ({
        id: novoId("usr"),
        nome: u.nome,
        email: u.email,
        papel: u.papel,
        cargo: u.cargo,
        senhaHash: hash,
        ativo: true,
      })),
    );
    console.log(`✓ ${USUARIOS.length} acessos criados.`);
  } else {
    console.log("· usuários já existem — mantido.");
  }

  /* Serviços */
  const [totalServicos] = await db.select({ n: count() }).from(servicos);
  if (!totalServicos?.n) {
    await db.insert(servicos).values(
      SERVICOS.map((s) => ({ id: novoId("srv"), ativo: true, ...s })),
    );
    console.log(`✓ ${SERVICOS.length} serviços no catálogo.`);
  } else {
    console.log("· catálogo já existe — mantido.");
  }

  /* Questionário padrão */
  const jaTemModelo = await db
    .select({ id: modelosConformidade.id })
    .from(modelosConformidade)
    .where(eq(modelosConformidade.nome, "Diagnóstico de conformidade — padrão"))
    .limit(1);

  if (!jaTemModelo.length) {
    await db.insert(modelosConformidade).values({
      id: novoId("mdl"),
      nome: "Diagnóstico de conformidade — padrão",
      descricao:
        "Roteiro completo de conformidade ambiental para empresas e setor público. Cópia e adapte por demanda.",
      versao: MODELO_PADRAO.versao,
      modelo: MODELO_PADRAO,
      ativo: true,
    });
    console.log(
      `✓ questionário de conformidade criado (${MODELO_PADRAO.perguntas.length} perguntas).`,
    );
  } else {
    console.log("· questionário padrão já existe — mantido.");
  }

  console.log("");
  console.log("Acessos iniciais (troque a senha no primeiro login):");
  for (const u of USUARIOS) {
    console.log(`  ${u.papel.padEnd(11)} ${u.email}  ·  ${SENHA_INICIAL}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("✗ falha no seed:", err);
    process.exit(1);
  });