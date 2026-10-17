/**
 * Texto das mensagens.
 *
 * Módulo puro de propósito: sem `server-only`, sem banco, sem React.
 * É o arquivo que os testes unitários exercitam direto, porque é onde
 * mora o texto que chega no e-mail do cliente — se um placeholder
 * quebrar, é um e-mail errado na rua e o teste pega antes.
 *
 * Formato de placeholder: `{{snake_case}}`. Escolhi esse e não `${}`
 * porque o texto é digitado pela Layane em um formulário, e `{{...}}`
 * sobrevive a editor, clipboard e a colar de um e-mail antigo sem virar
 * template literal do JavaScript por acidente.
 */

export type tipoMensagem =
  | "cobranca"
  | "contrato"
  | "orcamento"
  | "conformidade"
  | "documento"
  | "aviso"
  | "atendimento";

export type Variaveis = Record<string, string>;

/**
 * Substitui `{{chave}}` pelos valores.
 *
 * Duas garantias:
 *
 * - Placeholder desconhecido **fica como está**, em vez de virar vazio.
 *   Ver `{{cliente_nome}}` escrito à mão num e-mail com o nome errado na
 *   tela é autoexplicativo; ver um espaço em branco no lugar do nome do
 *   cliente é pior que não ter enviado nada.
 * - Ao montar HTML, os valores passam por escape. Sem isso, um cliente
 *   chamado `<script>` ou um valor colado de outro lugar viraria
 *   injeção de script no e-mail do terceiro.
 */
export function interpolar(texto: string, valores: Variaveis): string {
  return texto.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (achado, chave: string) => {
    const valor = valores[chave.toLowerCase()];
    return valor === undefined ? achado : valor;
  });
}

/** Quais `{{chave}}` o texto usa. Alimenta o rodapé "variáveis disponíveis". */
export function extrairVariaveis(texto: string): string[] {
  const achadas = new Set<string>();
  for (const m of texto.matchAll(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi)) {
    achadas.add(m[1].toLowerCase());
  }
  return [...achadas].sort();
}

/** Escapa para contexto HTML. Idêntico ao que o React faz, por insistentemente. */
export function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Versão HTML a partir do texto puro.
 *
 * Só usa um subconjunto de Markdown — o suficiente para negrito, listas
 * e parágrafos, que é tudo que a Layane precisa. Um parser completo
 * puxaria uma dependência de 40kB para um ganho invisível no e-mail.
 */
export function textoParaHtml(texto: string): string {
  const escape = escaparHtml(texto);
  const blocos = escape
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  return blocos
    .map((bloco) => {
      const linhas = bloco.split("\n");
      const todasMarcador = linhas.every((l) => /^\s*[-*]\s+/.test(l));
      if (todasMarcador && linhas.length > 0) {
        const itens = linhas
          .map((l) => `    <li>${aplicarInline(l.replace(/^\s*[-*]\s+/, ""))}</li>`)
          .join("\n");
        return `  <ul>\n${itens}\n  </ul>`;
      }
      return `  <p>${aplicarInline(bloco.replace(/\n/g, "<br />"))}</p>`;
    })
    .join("\n");
}

function aplicarInline(texto: string): string {
  return texto
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|\s)_([^_]+)_(?=\s|$)/g, "$1<em>$2</em>");
}

/* ------------------------------------------------------------------ */
/* Assuntos                                                            */
/* ------------------------------------------------------------------ */

export const ASSUNTOS: Record<tipoMensagem, string> = {
  cobranca: "Cobrança de {{valor}} — Layane Marques",
  contrato: "Seu contrato de consultoria ambiental",
  orcamento: "Proposta de consultoria ambiental",
  conformidade: "Relatório de conformidade ambiental",
  documento: "Documento disponível para consulta",
  aviso: "Aviso importante sobre o seu atendimento",
  atendimento: "Retorno do seu contato",
};

/* ------------------------------------------------------------------ */
/* Textos                                                              */
/* ------------------------------------------------------------------ */

/**
 * Os textos são da Layane, não meus. Tunei o tom para o que ela
 * descreveu: consultancy ambiental, atendimento direto, cliente
 * brasileiro. Nada de "prezado cliente" — ela não escreve assim, e o
 * e-mail não soa como robô de banco.
 */
export const TEXTOS: Record<tipoMensagem, string> = {
  cobranca: `Olá, {{cliente_nome}}!

Passando para lembrar da cobrança referente aos serviços de consultoria ambiental.

* Descrição: {{descricao}}
* Valor: {{valor}}
* Vencimento: {{vencimento}}

Se você já fez o pagamento, é só me avisar por aqui que eu confiro e atualizo o controle.

Se precisar de outra data de vencimento ou de ajuda com o pagamento, me fala que a gente resolve.

Obrigada pela confiança!

Layane Marques
Consultoria Ambiental`,

  contrato: `Olá, {{cliente_nome}}!

Segue o contrato de consultoria ambiental, já com o que combinamos por telefone.

* Referente a: {{referente}}
* Escopo: {{descricao}}

Vale conferir os pontos principais antes de assinar:
* O que está incluído no escopo
* Os prazos de cada etapa
* A forma de pagamento

Depois de assinado, é só me devolver por aqui que eu arquivo e começo o cronograma.

Qualquer dúvida, me chama.

Layane Marques
Consultoria Ambiental`,

  orcamento: `Olá, {{cliente_nome}}!

Preparei uma proposta para o que você me contou.

* Serviço: {{descricao}}
* Valor: {{valor}}
* Prazo: {{prazo}}

A proposta não é um compromisso: se quiser ajustar escopo, prazo ou forma de pagamento, a gente conversa antes.

Se fizer sentido para você, me confirma que eu monto o contrato.

Obrigada!

Layane Marques
Consultoria Ambiental`,

  conformidade: `Olá, {{cliente_nome}}!

Seu relatório de conformidade ambiental está pronto.

* Referente a: {{referente}}

O relatório traz o diagnóstico da situação atual, a base legal de cada item e o que precisa ser regularizado, com o prazo de cada um.

Dá uma olhada e me conta o que achou. A gente pode priorizar juntos o que é mais urgente.

Qualquer dúvida sobre algum item do relatório, me chama.

Layane Marques
Consultoria Ambiental`,

  documento: `Olá, {{cliente_nome}}!

Passando um documento referente ao seu atendimento.

* Documento: {{descricao}}
* Referente a: {{referente}}

Fica disponível para você consultar.

Layane Marques
Consultoria Ambiental`,

  aviso: `Olá, {{cliente_nome}}!

Um aviso sobre o seu atendimento:

{{descricao}}

* Prazo: {{vencimento}}

Estou te avisando antes para você ter tempo de se organizar. Se precisar, a gente remarca sem problema.

Layane Marques
Consultoria Ambiental`,

  atendimento: `Olá, {{cliente_nome}}!

{{descricao}}

Qualquer coisa, estou à disposição.

Layane Marques
Consultoria Ambiental`,
};

/** Texto padrão quando a Layane cria um modelo novo do zero. */
export const MODELO_VAZIO: Record<tipoMensagem, string> = {
  cobranca: "Olá, {{cliente_nome}}!\n\n\n\nLayane Marques\nConsultoria Ambiental",
  contrato: "Olá, {{cliente_nome}}!\n\nSegue o contrato.\n\n\nLayane Marques\nConsultoria Ambiental",
  orcamento: "Olá, {{cliente_nome}}!\n\n\n\nLayane Marques\nConsultoria Ambiental",
  conformidade: "Olá, {{cliente_nome}}!\n\n\n\nLayane Marques\nConsultoria Ambiental",
  documento: "Olá, {{cliente_nome}}!\n\n\n\nLayane Marques\nConsultoria Ambiental",
  aviso: "Olá, {{cliente_nome}}!\n\n\n\nLayane Marques\nConsultoria Ambiental",
  atendimento: "Olá, {{cliente_nome}}!\n\n\n\nLayane Marques\nConsultoria Ambiental",
};

/**
 * Documentação das variáveis por tipo.
 *
 * Aparece na tela de modelo para a Layane saber o que pode escrever sem
 * ter que decorar de cabeça.
 */
export const VARIAVEIS_POR_TIPO: Record<tipoMensagem, string[]> = {
  cobranca: ["cliente_nome", "valor", "vencimento", "descricao"],
  contrato: ["cliente_nome", "descricao", "referente"],
  orcamento: ["cliente_nome", "descricao", "valor", "prazo"],
  conformidade: ["cliente_nome", "referente"],
  documento: ["cliente_nome", "descricao", "referente"],
  aviso: ["cliente_nome", "descricao", "vencimento"],
  atendimento: ["cliente_nome", "descricao"],
};
