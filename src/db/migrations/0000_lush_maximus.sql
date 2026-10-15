CREATE TABLE `analises_conformidade` (
	`id` text PRIMARY KEY NOT NULL,
	`cliente_id` text NOT NULL,
	`modelo_id` text NOT NULL,
	`titulo` text NOT NULL,
	`status` text DEFAULT 'rascunho' NOT NULL,
	`respostas` text DEFAULT '{}' NOT NULL,
	`modelo_aplicado` text,
	`parecer` text,
	`recomendacoes` text,
	`indice_conformidade` integer,
	`emitido_em` text,
	`criado_em` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`atualizado_em` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`criado_por` text,
	FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`modelo_id`) REFERENCES `modelos_conformidade`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`criado_por`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `atendimentos` (
	`id` text PRIMARY KEY NOT NULL,
	`cliente_id` text NOT NULL,
	`demanda_id` text,
	`data` text NOT NULL,
	`tipo` text DEFAULT 'consulta' NOT NULL,
	`titulo` text NOT NULL,
	`resumo` text,
	`proximo_passo` text,
	`data_proximo_passo` text,
	`duracao_min` integer,
	`criado_em` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`criado_por` text,
	FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`demanda_id`) REFERENCES `demandas`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`criado_por`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `auditoria` (
	`id` text PRIMARY KEY NOT NULL,
	`usuario_id` text,
	`acao` text NOT NULL,
	`entidade` text NOT NULL,
	`entidade_id` text,
	`detalhe` text,
	`criado_em` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `clientes` (
	`id` text PRIMARY KEY NOT NULL,
	`nome` text NOT NULL,
	`nome_fantasia` text,
	`cnpj` text,
	`cpf` text,
	`setor_publico` integer DEFAULT false NOT NULL,
	`contato_nome` text,
	`contato_cargo` text,
	`contato_email` text,
	`contato_telefone` text,
	`whatsapp` text,
	`segmento` text,
	`porte` text,
	`endereco` text,
	`cidade` text,
	`uf` text,
	`status` text DEFAULT 'potencial' NOT NULL,
	`origem` text,
	`observacoes` text,
	`criado_em` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`atualizado_em` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`criado_por` text,
	FOREIGN KEY (`criado_por`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `configuracoes` (
	`chave` text PRIMARY KEY NOT NULL,
	`valor` text,
	`atualizado_em` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `contratos` (
	`id` text PRIMARY KEY NOT NULL,
	`cliente_id` text NOT NULL,
	`orcamento_id` text,
	`demanda_id` text,
	`numero` text NOT NULL,
	`titulo` text NOT NULL,
	`status` text DEFAULT 'rascunho' NOT NULL,
	`inicio` text,
	`fim` text,
	`valor_total` integer DEFAULT 0 NOT NULL,
	`forma_pagamento` text,
	`parcelas` integer DEFAULT 1 NOT NULL,
	`intervalo_parcelas_dias` integer DEFAULT 30 NOT NULL,
	`escopo` text,
	`investimento` text,
	`forma_de_pagamento_texto` text,
	`obrigacoes` text,
	`confidencialidade` text,
	`rescisao` text,
	`observacoes` text,
	`assinado_em` text,
	`criado_em` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`atualizado_em` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`criado_por` text,
	FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`orcamento_id`) REFERENCES `orcamentos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`demanda_id`) REFERENCES `demandas`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`criado_por`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `demandas` (
	`id` text PRIMARY KEY NOT NULL,
	`cliente_id` text NOT NULL,
	`titulo` text NOT NULL,
	`servico_id` text,
	`descricao` text,
	`status` text DEFAULT 'consulta' NOT NULL,
	`valor_estimado` integer DEFAULT 0 NOT NULL,
	`probabilidade` integer DEFAULT 10 NOT NULL,
	`prazo_dias` integer,
	`data_abertura` text,
	`data_fechamento` text,
	`responsavel_id` text,
	`criado_em` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`atualizado_em` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`criado_por` text,
	FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`servico_id`) REFERENCES `servicos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`responsavel_id`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`criado_por`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `despesas` (
	`id` text PRIMARY KEY NOT NULL,
	`descricao` text NOT NULL,
	`categoria` text,
	`valor` integer DEFAULT 0 NOT NULL,
	`data` text NOT NULL,
	`forma_pagamento` text DEFAULT 'pix' NOT NULL,
	`observacoes` text,
	`criado_em` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`criado_por` text,
	FOREIGN KEY (`criado_por`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `documentos` (
	`id` text PRIMARY KEY NOT NULL,
	`cliente_id` text NOT NULL,
	`nome` text NOT NULL,
	`tipo` text,
	`orgao` text,
	`numero` text,
	`emissao` text,
	`validade` text,
	`renovacao_dias` integer,
	`status` text DEFAULT 'valido' NOT NULL,
	`observacoes` text,
	`criado_em` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`criado_por` text,
	FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`criado_por`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `lancamentos` (
	`id` text PRIMARY KEY NOT NULL,
	`cliente_id` text NOT NULL,
	`contrato_id` text,
	`demanda_id` text,
	`descricao` text NOT NULL,
	`valor` integer DEFAULT 0 NOT NULL,
	`vencimento` text,
	`status` text DEFAULT 'pendente' NOT NULL,
	`forma_pagamento` text,
	`pago_em` text,
	`valor_recebido` integer DEFAULT 0 NOT NULL,
	`numero` text,
	`observacoes` text,
	`criado_em` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`criado_por` text,
	FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`contrato_id`) REFERENCES `contratos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`demanda_id`) REFERENCES `demandas`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`criado_por`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `modelos_conformidade` (
	`id` text PRIMARY KEY NOT NULL,
	`nome` text NOT NULL,
	`descricao` text,
	`versao` text DEFAULT '1.0' NOT NULL,
	`modelo` text NOT NULL,
	`ativo` integer DEFAULT true NOT NULL,
	`criado_em` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`atualizado_em` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`criado_por` text,
	FOREIGN KEY (`criado_por`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `orcamentos` (
	`id` text PRIMARY KEY NOT NULL,
	`cliente_id` text NOT NULL,
	`demanda_id` text,
	`numero` text NOT NULL,
	`titulo` text NOT NULL,
	`status` text DEFAULT 'rascunho' NOT NULL,
	`itens` text NOT NULL,
	`subtotal` integer DEFAULT 0 NOT NULL,
	`desconto_valor` integer DEFAULT 0 NOT NULL,
	`desconto_percentual` integer DEFAULT 0 NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	`condicao_pagamento` text,
	`prazo_entrega` text,
	`validade_dias` integer DEFAULT 15 NOT NULL,
	`valido_ate` text,
	`observacoes` text,
	`enviado_em` text,
	`aprovado_em` text,
	`criado_em` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`atualizado_em` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`criado_por` text,
	FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`demanda_id`) REFERENCES `demandas`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`criado_por`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pagamentos` (
	`id` text PRIMARY KEY NOT NULL,
	`lancamento_id` text NOT NULL,
	`cliente_id` text NOT NULL,
	`data` text NOT NULL,
	`valor` integer DEFAULT 0 NOT NULL,
	`forma_pagamento` text DEFAULT 'pix' NOT NULL,
	`tipo` text DEFAULT 'pagamento' NOT NULL,
	`observacoes` text,
	`criado_em` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`criado_por` text,
	FOREIGN KEY (`lancamento_id`) REFERENCES `lancamentos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`criado_por`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `servicos` (
	`id` text PRIMARY KEY NOT NULL,
	`nome` text NOT NULL,
	`descricao` text,
	`preco_padrao` integer DEFAULT 0 NOT NULL,
	`unidade` text DEFAULT 'projeto' NOT NULL,
	`ativo` integer DEFAULT true NOT NULL,
	`criado_em` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessoes` (
	`id` text PRIMARY KEY NOT NULL,
	`usuario_id` text NOT NULL,
	`expira_em` text NOT NULL,
	`criado_em` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessoes_token_idx` ON `sessoes` (`id`);--> statement-breakpoint
CREATE TABLE `usuarios` (
	`id` text PRIMARY KEY NOT NULL,
	`nome` text NOT NULL,
	`email` text NOT NULL,
	`senha_hash` text NOT NULL,
	`papel` text DEFAULT 'assistente' NOT NULL,
	`cargo` text,
	`ativo` integer DEFAULT true NOT NULL,
	`ultimo_acesso_em` text,
	`criado_em` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `usuarios_email_idx` ON `usuarios` (`email`);