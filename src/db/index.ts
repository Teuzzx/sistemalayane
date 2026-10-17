/**
 * Conexão com o banco.
 *
 * Postgres no Supabase. O `Pool` é criado uma vez por processo e
 * reaproveitado: abrir um socket novo a cada consulta custaria caro
 * dentro de uma serverless function, que é criada e destruída o tempo
 * todo. Criar o `Pool` não abre conexão — a primeira socket só sai
 * quando a primeira query roda.
 *
 * ATENÇÃO à porta do pooler do Supabase:
 *
 *   5432 → modo sessão. Cada cliente segura uma conexão dedicada até
 *          encerrar, e o teto é `pool_size` (20 no plano gratuito). Como
 *          a serverless abre um pool por instância, esse modo esgota em
 *          minutos de uso normal e as telas passam a subir com erro.
 *   6543 → modo transação. A conexão é emprestada por transação e
 *          devolvida em seguida, que é o modo certo para serverless.
 *
 * A conexão usada é a que tem `6543` na URL. Nada aqui usa statement
 * nomeado nem transação que atravessa requisições, então o modo transação
 * é compatível de ponta a ponta.
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

/** O banco está apontado para algum lugar? Vira aviso na tela, não 500. */
export const bancoConfigurado = Boolean(process.env.DATABASE_URL);

/**
 * Tira o `sslmode` da URL porque ele VENCE a opção `ssl` do `pg`.
 *
 * A connection string que o painel do Supabase entrega vem com
 * `?sslmode=require`, e com ela a conexão morre em
 * `SELF_SIGNED_CERT_IN_CHAIN`: o certificado do Supabase não valida
 * contra a cadeia padrão do Node, e o `ssl: { rejectUnauthorized: false }`
 * configurado no Pool é ignorado. Sem tirar o parâmetro, a aplicação não
 * conecta em lugar nenhum — nem local.
 *
 * O TLS continua acontecendo: é o `ssl` do Pool que assume, abaixo.
 */
function semSslmode(valor: string): string {
  const [base, query] = valor.split("?");
  if (!query) return base;
  const limpo = query
    .split("&")
    .filter((p) => !p.toLowerCase().startsWith("sslmode="));
  return limpo.length ? `${base}?${limpo.join("&")}` : base;
}

const bruto = process.env.DATABASE_URL ?? "";
const conexao = semSslmode(bruto);

/*
 * Sem `DATABASE_URL` a URL abaixo aponta para um host que não existe de
 * propósito. A tentativa de conexão só acontece se alguma consulta rodar
 * mesmo assim, e o erro que sobe é de socket — não a mensagem que
 * explica o que fazer. Quem explica é `BancoNaoConfigurado`, na tela.
 *
 * `max: 2` e não 10. Cada instância de serverless function cria o seu
 * próprio pool, e o pooler do Supabase limita o total de clientes: com
 * 10 por instância, duas instâncias concorrentes já esgotavam o pooler
 * (`EMAXCONNSESSION: max clients reached`) e as telas seguintes subiam
 * com erro de servidor. Duas conexões por instância bastam para as
 * consultas paralelas do painel e mantêm a conta longe do teto.
 *
 * `connectionTimeoutMillis` existe para o erro ser um erro — e não uma
 * tela travada esperando um socket que nunca abre.
 */
export const pool = new Pool({
  connectionString: conexao || "postgresql://postgres:postgres@127.0.0.1:1/ningum",
  ssl: /localhost|127\.0\.0\.1/.test(conexao) ? undefined : { rejectUnauthorized: false },
  max: 2,
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 10_000,
});

export const db = drizzle(pool, { schema });

export * as tabelas from "./schema";
export type {
  Cliente,
  ClienteStatus,
  Demanda,
  DemandaStatus,
  Atendimento,
  Documento,
  Orcamento,
  OrcamentoItem,
  Contrato,
  Lancamento,
  Pagamento,
  Despesa,
  ModeloConformidade,
  Pergunta,
  Resposta,
  AnaliseConformidade,
  Usuario,
  Papel,
} from "./schema";