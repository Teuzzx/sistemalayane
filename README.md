# Sistema interno — Layane Marques | Gestão Ambiental Aplicada

Sistema de operação para a Layane: clientes, histórico de atendimento,
funil de demandas, vencimentos, financeiro, orçamento, contrato e relatório
de conformidade.

Mesma identidade visual do site institucional (`DESIGN_DNA.md` na raiz do
repositório): verde-oliva da logo, tipografia Barlow Semi Condensed, vidro
sobre fundo de território cinematográfico.

---

## Banco de dados

Postgres no Supabase. Copie `.env.example` para `.env.local` e cole a
connection string:

```bash
cp .env.example .env.local
# edite e cole a string em DATABASE_URL
```

Onde pegar: **Supabase → Project Settings → Database → Connection string →
URI**. Pode deixar o `?sslmode=require` que vem no fim — o código tira o
parâmetro e cuida do TLS sozinho.

Sem `DATABASE_URL` o sistema mostra uma tela explicando o que falta, em
vez de um 500 sem texto.

## Rodando local

```bash
npm install
npm run setup                   # cria as tabelas e popula o conteúdo inicial
npm run dev
```

Abre em **http://localhost:3100**.

### Acessos criados pelo seed

| Papel | E-mail | Senha |
|---|---|---|
| `admin` (Layane) | `layane@layanemarques.com.br` | `layane2026` |
| `assistente` | `assistente@layanemarques.com.br` | `layane2026` |

> ⚠️ **Troque as senhas no primeiro acesso.** O seed só roda se a tabela
> `usuarios` estiver vazia — rodar de novo não sobrescreve o que já existe.

O seed popula **estrutura**, nunca dado inventado: os dois acessos, o
catálogo de serviços (8 itens, com preço em branco de propósito) e o
questionário de conformidade (30 perguntas em 10 blocos). Nenhum cliente,
contrato ou valor.

---

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Desenvolvimento (porta 3100) |
| `npm run build` | Build de produção |
| `npm run start` | Sobe o build de produção (porta 3100) |
| `npm run typecheck` | TypeScript sem emitir |
| `npm run db:migrate` | Aplica as migrations |
| `npm run db:seed` | Popula acessos, serviços e questionário |
| `npm run db:generate` | Gera migration a partir do schema |
| `npm run db:studio` | Abre o Drizzle Studio |

---

## 🚨 deploying na Vercel — LEIA ANTES

**O app NÃO funciona na Vercel só com este repositório.**

O banco é SQLite num arquivo local (`file:./data/layane.db`). O sistema de
arquivos da Vercel é efêmero e somente leitura fora de `/tmp` — o app até
carrega a tela de login, mas **toda consulta ao banco falha** e ninguém
consegue entrar.

O caminho da Vercel é a **variável de ambiente apontando para um Turso**.
Nenhuma linha de código muda — o `@libsql/client` fala com os dois.

### Passo a passo

**1. Criar o banco no Turso** (conta grátis em [turso.tech](https://turso.tech))

```bash
npx turso login
npx turso db create layane
```

Ele devolve uma URL no formato `libsql://layane-xxxx.turso.io` e um token.

**2. Apontar para o banco**

```bash
$env:DATABASE_URL="libsql://layane-xxxx.turso.io"
$env:DATABASE_AUTH_TOKEN="seu-token"
npm run db:migrate
npm run db:seed
```

**3. Na Vercel**, em *Settings → Environment Variables*:

```
DATABASE_URL          = libsql://layane-xxxx.turso.io
DATABASE_AUTH_TOKEN   = <o token>
SESSION_DAYS          = 30
```

Deploy. Sem essas duas variáveis a aplicação não sobe de verdade.

---

## Estrutura

```
src/
  app/
    (app)/           rotas internas (painel, clientes, financeiro, …)
    doc/             documentos imprimíveis (orçamento, contrato, relatório)
    login/           entrada
  actions/           Server Actions — toda escrita passa por aqui
  components/        UI, formulários, gráficos, shell
  db/
    schema.ts        16 tabelas + rótulos de status
    migrations/      SQL versionado
    seed.ts          conteúdo inicial
  lib/
    auth.ts          sessão e papéis (só servidor)
    papeis.ts        papéis e rótulos (puro, usado no cliente)
    comercial.ts     regras de orçamento, desconto e cronograma
    conformidade.ts  índice, parecer e recomendações
    consultas.ts     leituras (painel, listas, detalhe)
    money.ts         dinheiro em centavos
    dates.ts         datas em YYYY-MM-DD
```

---

## Regras que o código segue

- **Dinheiro é sempre `integer` de centavos.** Nunca float. A conversão
  acontece só na hora de formatar.
- **Data é sempre `YYYY-MM-DD`**, sem fuso. Data com hora é ISO 8601.
- **O total nunca vem do formulário.** O navegador manda os itens; o
  servidor refaz a conta em `calcularTotais`.
- **Desconto não apaga o valor cobrado.** Vira movimentação negativa no
  histórico — o sistema guarda as duas verdades.
- **Cliente não é apagado, é arquivado.** Quem tem histórico sai da lista.
- **Vencimento é derivado na leitura**, não gravado. Não há rotina noturna.
- **Relatório emitido congela o questionário aplicado.** Editar o modelo
  depois não muda documento já entregue.

---

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 ·
SQLite via libSQL · Drizzle ORM · bcryptjs

O `dev` roda em webpack de propósito: o Turbopack deste repositório resolve
a raiz no repositório git, que está um nível acima, e isso quebra os path dos
route groups. O build de produção não é afetado.