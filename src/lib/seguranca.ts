/**
 * Proteção contra força bruta.
 *
 * Janela deslizante de 15 minutos. A regra é deliberadamente dura no
 * erro e leniente no acerto: errar a senha cinco vezes exige esperar,
 * mas um login certo limpa a contagem na hora — senão a Layane ficaria
 * trancada fora do próprio sistema num dia corrido.
 *
 * O IP entra na conta com peso dobrado: atacar vários e-mails a partir
 * da mesma máquina é mais grave do que insistir num e-mail só.
 */

import "server-only";

import { and, count, desc, eq, gt, sql } from "drizzle-orm";
import { headers } from "next/headers";

import { db } from "@/db";
import { tentativasLogin } from "@/db/schema";

const JANELA_MIN = 15;
const LIMITE_POR_EMAIL = 5;
const LIMITE_POR_IP = 20;
const LIMITE_DE_HORTAO_MS = JANELA_MIN * 60 * 1000;

export type SituacaoTentativa = {
  bloqueado: boolean;
  /** Minutos restantes — só para a Layane entender quanto esperar. */
  esperaMin: number;
  motivo?: string;
};

/**
 * IP do cliente.
 *
 * Em produção (Vercel/Turbo) o `x-real-ip` é definido pela plataforma
 * e confiável. Em desenvolvimento pode não existir — daí o `null`, que
 * desliga o limite por IP (o limite por e-mail continua valendo, que é
 * o que barra o ataque comum).
 */
export async function ipDoCliente(): Promise<string | null> {
  try {
    const h = await headers();
    return (
      h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null
    );
  } catch {
    return null;
  }
}

/**
 * Situação atual para um par (e-mail, ip).
 */
export async function situacao(
  email: string,
  ip: string | null,
): Promise<SituacaoTentativa> {
  const desde = new Date(Date.now() - LIMITE_DE_HORTAO_MS).toISOString();

  const [porEmail] = await db
    .select({ n: count() })
    .from(tentativasLogin)
    .where(
      and(
        eq(tentativasLogin.email, email.toLowerCase()),
        eq(tentativasLogin.sucesso, false),
        gt(tentativasLogin.criadoEm, desde),
      ),
    );

  const falhasEmail = porEmail?.n ?? 0;

  let falhasIp = 0;
  if (ip) {
    const [r] = await db
      .select({ n: count() })
      .from(tentativasLogin)
      .where(
        and(
          eq(tentativasLogin.ip, ip),
          eq(tentativasLogin.sucesso, false),
          gt(tentativasLogin.criadoEm, desde),
        ),
      );
    falhasIp = r?.n ?? 0;
  }

  const estourouEmail = falhasEmail >= LIMITE_POR_EMAIL;
  const estourouIp = falhasIp >= LIMITE_POR_IP;

  if (!estourouEmail && !estourouIp) {
    return { bloqueado: false, esperaMin: 0 };
  }

  /* A espera é a que falta para a falha mais recente sair da janela. */
  const [ultima] = await db
    .select({ criadoEm: tentativasLogin.criadoEm })
    .from(tentativasLogin)
    .where(
      and(
        eq(tentativasLogin.email, email.toLowerCase()),
        eq(tentativasLogin.sucesso, false),
        gt(tentativasLogin.criadoEm, desde),
      ),
    )
    .orderBy(desc(tentativasLogin.criadoEm))
    .limit(1);

  const resta = ultima
    ? LIMITE_DE_HORTAO_MS - (Date.now() - new Date(ultima.criadoEm).getTime())
    : LIMITE_DE_HORTAO_MS;
  const esperaMin = Math.max(1, Math.ceil(resta / 60_000));

  return {
    bloqueado: true,
    esperaMin,
    motivo: estourouIp
      ? "Muitas tentativas vindas do mesmo endereço de rede."
      : "Muitas tentativas com esta senha.",
  };
}

/** Registra uma tentativa (sucesso ou falha). */
export async function registrar(
  email: string,
  ip: string | null,
  sucesso: boolean,
  motivo?: string,
): Promise<void> {
  await db.insert(tentativasLogin).values({
    id: `tl_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    email: email.toLowerCase(),
    ip,
    sucesso,
    motivo: motivo ?? null,
  });

  /* Faxina por probabilidade: uma linha a cada ~5% dos logins, o que
     segura a tabela pequena sem precisar de cron. */
  if (Math.random() < 0.05) {
    const limite = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    await db.delete(tentativasLogin).where(sql`${tentativasLogin.criadoEm} < ${limite}`);
  }
}

/** Login certo: zera o histórico de falha daquele e-mail. */
export async function limpar(email: string): Promise<void> {
  await db
    .delete(tentativasLogin)
    .where(
      and(
        eq(tentativasLogin.email, email.toLowerCase()),
        eq(tentativasLogin.sucesso, false),
      ),
    );
}

