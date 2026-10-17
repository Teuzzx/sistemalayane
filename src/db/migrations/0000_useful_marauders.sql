CREATE TABLE "analises_conformidade" (
	"id" text PRIMARY KEY NOT NULL,
	"cliente_id" text NOT NULL,
	"modelo_id" text NOT NULL,
	"titulo" text NOT NULL,
	"status" text DEFAULT 'rascunho' NOT NULL,
	"respostas" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"modelo_aplicado" jsonb,
	"parecer" text,
	"recomendacoes" text,
	"indice_conformidade" integer,
	"emitido_em" text,
	"criado_em" text DEFAULT to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"atualizado_em" text DEFAULT to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"criado_por" text
);
--> statement-breakpoint
CREATE TABLE "atendimentos" (
	"id" text PRIMARY KEY NOT NULL,
	"cliente_id" text NOT NULL,
	"demanda_id" text,
	"data" text NOT NULL,
	"tipo" text DEFAULT 'consulta' NOT NULL,
	"titulo" text NOT NULL,
	"resumo" text,
	"proximo_passo" text,
	"data_proximo_passo" text,
	"duracao_min" integer,
	"criado_em" text DEFAULT to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"criado_por" text
);
--> statement-breakpoint
CREATE TABLE "auditoria" (
	"id" text PRIMARY KEY NOT NULL,
	"usuario_id" text,
	"acao" text NOT NULL,
	"entidade" text NOT NULL,
	"entidade_id" text,
	"detalhe" text,
	"criado_em" text DEFAULT to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clientes" (
	"id" text PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"nome_fantasia" text,
	"cnpj" text,
	"cpf" text,
	"setor_publico" boolean DEFAULT false NOT NULL,
	"contato_nome" text,
	"contato_cargo" text,
	"contato_email" text,
	"contato_telefone" text,
	"whatsapp" text,
	"segmento" text,
	"porte" text,
	"endereco" text,
	"cidade" text,
	"uf" text,
	"status" text DEFAULT 'potencial' NOT NULL,
	"origem" text,
	"observacoes" text,
	"criado_em" text DEFAULT to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"atualizado_em" text DEFAULT to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"criado_por" text
);
--> statement-breakpoint
CREATE TABLE "configuracoes" (
	"chave" text PRIMARY KEY NOT NULL,
	"valor" text,
	"atualizado_em" text DEFAULT to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contratos" (
	"id" text PRIMARY KEY NOT NULL,
	"cliente_id" text NOT NULL,
	"orcamento_id" text,
	"demanda_id" text,
	"numero" text NOT NULL,
	"titulo" text NOT NULL,
	"status" text DEFAULT 'rascunho' NOT NULL,
	"inicio" text,
	"fim" text,
	"valor_total" integer DEFAULT 0 NOT NULL,
	"forma_pagamento" text,
	"parcelas" integer DEFAULT 1 NOT NULL,
	"intervalo_parcelas_dias" integer DEFAULT 30 NOT NULL,
	"escopo" text,
	"investimento" text,
	"forma_de_pagamento_texto" text,
	"obrigacoes" text,
	"confidencialidade" text,
	"rescisao" text,
	"observacoes" text,
	"assinado_em" text,
	"criado_em" text DEFAULT to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"atualizado_em" text DEFAULT to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"criado_por" text
);
--> statement-breakpoint
CREATE TABLE "demandas" (
	"id" text PRIMARY KEY NOT NULL,
	"cliente_id" text NOT NULL,
	"titulo" text NOT NULL,
	"servico_id" text,
	"descricao" text,
	"status" text DEFAULT 'consulta' NOT NULL,
	"valor_estimado" integer DEFAULT 0 NOT NULL,
	"probabilidade" integer DEFAULT 10 NOT NULL,
	"prazo_dias" integer,
	"data_abertura" text,
	"data_fechamento" text,
	"responsavel_id" text,
	"criado_em" text DEFAULT to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"atualizado_em" text DEFAULT to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"criado_por" text
);
--> statement-breakpoint
CREATE TABLE "despesas" (
	"id" text PRIMARY KEY NOT NULL,
	"descricao" text NOT NULL,
	"categoria" text,
	"valor" integer DEFAULT 0 NOT NULL,
	"data" text NOT NULL,
	"forma_pagamento" text DEFAULT 'pix' NOT NULL,
	"observacoes" text,
	"criado_em" text DEFAULT to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"criado_por" text
);
--> statement-breakpoint
CREATE TABLE "documentos" (
	"id" text PRIMARY KEY NOT NULL,
	"cliente_id" text NOT NULL,
	"nome" text NOT NULL,
	"tipo" text,
	"orgao" text,
	"numero" text,
	"emissao" text,
	"validade" text,
	"renovacao_dias" integer,
	"status" text DEFAULT 'valido' NOT NULL,
	"observacoes" text,
	"criado_em" text DEFAULT to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"criado_por" text
);
--> statement-breakpoint
CREATE TABLE "lancamentos" (
	"id" text PRIMARY KEY NOT NULL,
	"cliente_id" text NOT NULL,
	"contrato_id" text,
	"demanda_id" text,
	"descricao" text NOT NULL,
	"valor" integer DEFAULT 0 NOT NULL,
	"vencimento" text,
	"status" text DEFAULT 'pendente' NOT NULL,
	"forma_pagamento" text,
	"pago_em" text,
	"valor_recebido" integer DEFAULT 0 NOT NULL,
	"numero" text,
	"observacoes" text,
	"criado_em" text DEFAULT to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"criado_por" text
);
--> statement-breakpoint
CREATE TABLE "mensagens" (
	"id" text PRIMARY KEY NOT NULL,
	"thread_id" text NOT NULL,
	"cliente_id" text,
	"lancamento_id" text,
	"contrato_id" text,
	"orcamento_id" text,
	"analise_id" text,
	"tipo" text DEFAULT 'aviso' NOT NULL,
	"direcao" text DEFAULT 'enviada' NOT NULL,
	"destinatarioTipo" text DEFAULT 'cliente' NOT NULL,
	"para_nome" text,
	"para_email" text NOT NULL,
	"de_nome" text,
	"de_email" text,
	"assunto" text NOT NULL,
	"corpo" text,
	"corpo_html" text,
	"status" text DEFAULT 'fila' NOT NULL,
	"tentativas" integer DEFAULT 0 NOT NULL,
	"ultimo_erro" text,
	"provedor_id" text,
	"enviado_em" text,
	"lido_em" text,
	"criado_por" text,
	"criado_em" text DEFAULT to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "modelos_conformidade" (
	"id" text PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"descricao" text,
	"versao" text DEFAULT '1.0' NOT NULL,
	"modelo" jsonb NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" text DEFAULT to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"atualizado_em" text DEFAULT to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"criado_por" text
);
--> statement-breakpoint
CREATE TABLE "modelos_email" (
	"id" text PRIMARY KEY NOT NULL,
	"tipo" text NOT NULL,
	"nome" text NOT NULL,
	"assunto" text NOT NULL,
	"corpo" text NOT NULL,
	"variaveis" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" text DEFAULT to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"atualizado_em" text DEFAULT to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orcamentos" (
	"id" text PRIMARY KEY NOT NULL,
	"cliente_id" text NOT NULL,
	"demanda_id" text,
	"numero" text NOT NULL,
	"titulo" text NOT NULL,
	"status" text DEFAULT 'rascunho' NOT NULL,
	"itens" jsonb NOT NULL,
	"subtotal" integer DEFAULT 0 NOT NULL,
	"desconto_valor" integer DEFAULT 0 NOT NULL,
	"desconto_percentual" integer DEFAULT 0 NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"condicao_pagamento" text,
	"prazo_entrega" text,
	"validade_dias" integer DEFAULT 15 NOT NULL,
	"valido_ate" text,
	"observacoes" text,
	"enviado_em" text,
	"aprovado_em" text,
	"criado_em" text DEFAULT to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"atualizado_em" text DEFAULT to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"criado_por" text
);
--> statement-breakpoint
CREATE TABLE "pagamentos" (
	"id" text PRIMARY KEY NOT NULL,
	"lancamento_id" text NOT NULL,
	"cliente_id" text NOT NULL,
	"data" text NOT NULL,
	"valor" integer DEFAULT 0 NOT NULL,
	"forma_pagamento" text DEFAULT 'pix' NOT NULL,
	"tipo" text DEFAULT 'pagamento' NOT NULL,
	"observacoes" text,
	"criado_em" text DEFAULT to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"criado_por" text
);
--> statement-breakpoint
CREATE TABLE "servicos" (
	"id" text PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"descricao" text,
	"preco_padrao" integer DEFAULT 0 NOT NULL,
	"unidade" text DEFAULT 'projeto' NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" text DEFAULT to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessoes" (
	"id" text PRIMARY KEY NOT NULL,
	"usuario_id" text NOT NULL,
	"expira_em" text NOT NULL,
	"criado_em" text DEFAULT to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tentativas_login" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"ip" text,
	"sucesso" boolean DEFAULT false NOT NULL,
	"motivo" text,
	"criado_em" text DEFAULT to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" text PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"senha_hash" text NOT NULL,
	"papel" text DEFAULT 'assistente' NOT NULL,
	"cargo" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"ultimo_acesso_em" text,
	"criado_em" text DEFAULT to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analises_conformidade" ADD CONSTRAINT "analises_conformidade_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analises_conformidade" ADD CONSTRAINT "analises_conformidade_modelo_id_modelos_conformidade_id_fk" FOREIGN KEY ("modelo_id") REFERENCES "public"."modelos_conformidade"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analises_conformidade" ADD CONSTRAINT "analises_conformidade_criado_por_usuarios_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atendimentos" ADD CONSTRAINT "atendimentos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atendimentos" ADD CONSTRAINT "atendimentos_demanda_id_demandas_id_fk" FOREIGN KEY ("demanda_id") REFERENCES "public"."demandas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atendimentos" ADD CONSTRAINT "atendimentos_criado_por_usuarios_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_criado_por_usuarios_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_orcamento_id_orcamentos_id_fk" FOREIGN KEY ("orcamento_id") REFERENCES "public"."orcamentos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_demanda_id_demandas_id_fk" FOREIGN KEY ("demanda_id") REFERENCES "public"."demandas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_criado_por_usuarios_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demandas" ADD CONSTRAINT "demandas_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demandas" ADD CONSTRAINT "demandas_servico_id_servicos_id_fk" FOREIGN KEY ("servico_id") REFERENCES "public"."servicos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demandas" ADD CONSTRAINT "demandas_responsavel_id_usuarios_id_fk" FOREIGN KEY ("responsavel_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demandas" ADD CONSTRAINT "demandas_criado_por_usuarios_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "despesas" ADD CONSTRAINT "despesas_criado_por_usuarios_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_criado_por_usuarios_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_contrato_id_contratos_id_fk" FOREIGN KEY ("contrato_id") REFERENCES "public"."contratos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_demanda_id_demandas_id_fk" FOREIGN KEY ("demanda_id") REFERENCES "public"."demandas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_criado_por_usuarios_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensagens" ADD CONSTRAINT "mensagens_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensagens" ADD CONSTRAINT "mensagens_lancamento_id_lancamentos_id_fk" FOREIGN KEY ("lancamento_id") REFERENCES "public"."lancamentos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensagens" ADD CONSTRAINT "mensagens_contrato_id_contratos_id_fk" FOREIGN KEY ("contrato_id") REFERENCES "public"."contratos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensagens" ADD CONSTRAINT "mensagens_orcamento_id_orcamentos_id_fk" FOREIGN KEY ("orcamento_id") REFERENCES "public"."orcamentos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensagens" ADD CONSTRAINT "mensagens_analise_id_analises_conformidade_id_fk" FOREIGN KEY ("analise_id") REFERENCES "public"."analises_conformidade"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensagens" ADD CONSTRAINT "mensagens_criado_por_usuarios_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modelos_conformidade" ADD CONSTRAINT "modelos_conformidade_criado_por_usuarios_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_demanda_id_demandas_id_fk" FOREIGN KEY ("demanda_id") REFERENCES "public"."demandas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_criado_por_usuarios_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_lancamento_id_lancamentos_id_fk" FOREIGN KEY ("lancamento_id") REFERENCES "public"."lancamentos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_criado_por_usuarios_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sessoes_token_idx" ON "sessoes" USING btree ("id");--> statement-breakpoint
CREATE UNIQUE INDEX "usuarios_email_idx" ON "usuarios" USING btree ("email");