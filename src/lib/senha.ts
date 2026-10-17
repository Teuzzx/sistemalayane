/**
 * Regras de senha.
 *
 * Arquivo separado de propósito: não importa nada de servidor, então
 * roda igual no navegador (para o medidor de força em tempo real) e no
 * teste unitário. Se isto morasse junto de `seguranca.ts`, o `import
 * "server-only"` derrubaria o teste na hora.
 *
 * A referência é NIST SP 800-63B: comprimento pesa mais que alfabeto.
 * Por isso o requisito central é o tamanho, e não "tem maiúscula,
 * minúscula, símbolo e número" — que na prática só empurra a pessoa a
 * escrever `Senha@123`, presente em toda lista de senhas vazadas.
 */

/** Tamanho mínimo. 10 é o ponto onde o brute force deixa de valer. */
export const TAMANHO_MINIMO = 10;

/** Palavras que aparecem em toda breach e que não protegem nada. */
const COMUNS = [
  "senha",
  "password",
  "passwd",
  "123456",
  "12345678",
  "layane",
  "marques",
  "admin",
  "qwerty",
  "abc123",
  "letmein",
];

export type ForcaSenha = {
  ok: boolean;
  /** 0 (recusada) a 4 (boa). Serve para a barra do formulário. */
  nota: 0 | 1 | 2 | 3 | 4;
  problemas: string[];
};

export function avaliarSenha(senha: string): ForcaSenha {
  const problemas: string[] = [];
  const alvo = senha.toLowerCase();

  if (senha.length < TAMANHO_MINIMO) {
    problemas.push(`Pelo menos ${TAMANHO_MINIMO} caracteres.`);
  }
  if (!/[a-z]/.test(senha)) problemas.push("Uma letra minúscula.");
  if (!/[A-Z]/.test(senha)) problemas.push("Uma letra maiúscula.");
  if (!/[0-9]/.test(senha)) problemas.push("Um número.");

  const comum = COMUNS.find((c) => alvo.includes(c));
  if (comum) {
    problemas.push(`Não use "${comum}" nem o próprio nome.`);
  }

  const nota = Math.max(0, Math.min(4, 4 - problemas.length)) as 0 | 1 | 2 | 3 | 4;
  return { ok: problemas.length === 0, nota, problemas };
}

/** Rótulo curto para a barra de força no formulário. */
export function rotuloForca(nota: ForcaSenha["nota"]): string {
  return ["", "Fraca", "Razoável", "Boa", "Ótima"][nota] ?? "";
}
