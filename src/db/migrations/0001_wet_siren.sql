CREATE TABLE `mensagens` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text NOT NULL,
	`cliente_id` text,
	`lancamento_id` text,
	`contrato_id` text,
	`orcamento_id` text,
	`analise_id` text,
	`tipo` text DEFAULT 'aviso' NOT NULL,
	`direcao` text DEFAULT 'enviada' NOT NULL,
	`destinatarioTipo` text DEFAULT 'cliente' NOT NULL,
	`para_nome` text,
	`para_email` text NOT NULL,
	`de_nome` text,
	`de_email` text,
	`assunto` text NOT NULL,
	`corpo` text,
	`corpo_html` text,
	`status` text DEFAULT 'fila' NOT NULL,
	`tentativas` integer DEFAULT 0 NOT NULL,
	`ultimo_erro` text,
	`provedor_id` text,
	`enviado_em` text,
	`lido_em` text,
	`criado_por` text,
	`criado_em` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lancamento_id`) REFERENCES `lancamentos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`contrato_id`) REFERENCES `contratos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`orcamento_id`) REFERENCES `orcamentos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`analise_id`) REFERENCES `analises_conformidade`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`criado_por`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `modelos_email` (
	`id` text PRIMARY KEY NOT NULL,
	`tipo` text NOT NULL,
	`nome` text NOT NULL,
	`assunto` text NOT NULL,
	`corpo` text NOT NULL,
	`variaveis` text DEFAULT '[]' NOT NULL,
	`ativo` integer DEFAULT true NOT NULL,
	`criado_em` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`atualizado_em` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tentativas_login` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`ip` text,
	`sucesso` integer DEFAULT false NOT NULL,
	`motivo` text,
	`criado_em` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
