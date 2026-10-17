import { desc, gt } from "drizzle-orm";

import { db } from "@/db";
import { sessoes, tentativasLogin } from "@/db/schema";

/**
 * Leitura para o painel de segurança.
 *
 * Existe como função separada porque quem precisa é uma tela só. Uma
 * tela que monta a própria query vira quatro telas quando a segunda
 * precisar dos mesmos dados — e divergem, sempre.
 */

/** Onde a busca de tentativas parou, para a tela mostrar "últimas 24h". */
export const JANELA_DE_TENTATIVAS_HORAS = 24;

export type PanoramaSeguranca = {
  /** Tentativas falhadas na janela. */
  falhas: number;
  /** Tentativas bem-sucedidas na janela. */
  sucessos: number;
  /** E-mails com 3 ou mais falhas — os que estão sendo atacados. */
  sobAtaque: { email: string; n: number; ultimaEm: string }[];
  /** Últimas tentativas, em ordem de chegada. */
  recentes: {
    email: string;
    ip: string | null;
    sucesso: boolean;
    motivo: string | null;
    criadoEm: string;
  }[];
  sessoesAbertas: number;
};

export async function panoramaSeguranca(): Promise<PanoramaSeguranca> {
  const desde = new Date(
    Date.now() - JANELA_DE_TENTATIVAS_HORAS * 60 * 60 * 1000,
  ).toISOString();

  /* Sessão não tem `revogadaEm` — revogar é apagar a linha. Então as
     "vivas" são as que ainda não expiraram. */
  const [todas, sessoesVivas] = await Promise.all([
    db
      .select()
      .from(tentativasLogin)
      .where(gt(tentativasLogin.criadoEm, desde))
      .orderBy(desc(tentativasLogin.criadoEm))
      .limit(200),
    db
      .select({ id: sessoes.id })
      .from(sessoes)
      .where(gt(sessoes.expiraEm, new Date().toISOString())),
  ]);

  const falhas = todas.filter((t) => !t.sucesso);

  /* Agrega por e-mail, contando só quem insiste. Um e-mail com 1 falha é
     alguém que digitou a senha errada; com 5 no mesmo dia, é ataque. */
  const porEmail = new Map<string, number>();
  for (const t of falhas) {
    porEmail.set(t.email, (porEmail.get(t.email) ?? 0) + 1);
  }

  const sobAtaque = [...porEmail.entries()]
    .filter(([, n]) => n >= 3)
    .map(([email, n]) => ({
      email,
      n,
      ultimaEm:
        falhas.find((t) => t.email === email)?.criadoEm ??
        new Date().toISOString(),
    }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 10);

  return {
    falhas: falhas.length,
    sucessos: todas.length - falhas.length,
    sobAtaque,
    recentes: todas.slice(0, 25),
    sessoesAbertas: sessoesVivas.length,
  };
}
