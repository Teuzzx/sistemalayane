import { randomBytes, randomUUID } from "node:crypto";

/** Id curto e legível no banco: `cli_a1b2c3d4`. */
export function novoId(prefixo: string): string {
  return `${prefixo}_${randomBytes(8).toString("hex")}`;
}

export function idAleatorio(): string {
  return randomUUID();
}

/** Token de sessão opaco (não é JWT — é revogável, que é o que queremos). */
export function novoToken(): string {
  return randomBytes(32).toString("base64url");
}