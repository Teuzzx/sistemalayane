/**
 * Datas.
 *
 * No banco, data é SEMPRE `YYYY-MM-DD` (sem fuso) — é o que a Layane
 * escreve no papel e o que o brasileiro lê. Data+hora é ISO 8601.
 * Nada de `new Date("2026-01-05")` espalhado pelo sistema: passa por aqui.
 */

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const MESES_CURTO = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export function hoje(): string {
  return paraISO(new Date());
}

/** `Date` → `"YYYY-MM-DD"` no fuso local (não UTC — isso buga dia anterior). */
export function paraISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dia}`;
}

/** `"YYYY-MM-DD"` → `Date` no meio-dia local (evita virar dia anterior). */
export function deISO(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12, 0, 0);
}

export function somaDias(iso: string, dias: number): string {
  const d = deISO(iso);
  if (!d) return iso;
  d.setDate(d.getDate() + dias);
  return paraISO(d);
}

export function somaMeses(iso: string, meses: number): string {
  const d = deISO(iso);
  if (!d) return iso;
  const diaOriginal = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + meses);
  // Evita 31 de janeiro + 1 mês virar 3 de março.
  const ultimoDia = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(diaOriginal, ultimoDia));
  return paraISO(d);
}

export function diferencaDias(deISO_: string, ateISO: string): number {
  const a = deISO(deISO_);
  const b = deISO(ateISO);
  if (!a || !b) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** `05/03/2026` */
export function formatarData(iso: string | null | undefined): string {
  const d = deISO(iso);
  if (!d) return "—";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

/** `5 de março de 2026` — usado nos documentos que vão para o cliente. */
export function dataPorExtenso(iso: string | null | undefined): string {
  const d = deISO(iso);
  if (!d) return "—";
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

/** `03/2026` */
export function formatarMesAno(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m] = iso.slice(0, 7).split("-");
  return `${m}/${y}`;
}

/** `terça-feira, 5 de março de 2026` */
export function dataExtensoLonga(iso: string | null | undefined): string {
  const d = deISO(iso);
  if (!d) return "—";
  return `${DIAS[d.getDay()]}, ${dataPorExtenso(iso)}`;
}

/** `"hoje"` · `"em 3 dias"` · `"há 5 dias"` · `"venceu"` */
export function prazoRelativo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const dias = diferencaDias(hoje(), iso);
  if (dias === 0) return "hoje";
  if (dias === 1) return "amanhã";
  if (dias === -1) return "ontem";
  if (dias > 0) return `em ${dias} dias`;
  return `há ${Math.abs(dias)} dias`;
}

/** `"2026-03" → "março de 2026"` */
export function rotuloMesChave(chave: string): string {
  const [y, m] = chave.split("-").map(Number);
  if (!y || !m) return chave;
  return `${MESES[m - 1]} de ${y}`;
}

/** Os últimos/primeiros `n` meses terminando em `ate`, como `"YYYY-MM"`. */
export function janelaMeses(n: number, ate = hoje()): string[] {
  const d = deISO(ate) ?? new Date();
  const saida: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const alvo = new Date(d.getFullYear(), d.getMonth() - i, 1);
    saida.push(`${alvo.getFullYear()}-${String(alvo.getMonth() + 1).padStart(2, "0")}`);
  }
  return saida;
}

/** Lista de anos com movimento, do mais novo pro mais velho. */
export function anosDisponiveis(
  valores: (string | null | undefined)[],
): number[] {
  const anos = new Set(valores.filter(Boolean).map((v) => Number(v!.slice(0, 4))));
  if (anos.size === 0) anos.add(new Date().getFullYear());
  return [...anos].sort((a, b) => b - a);
}

export const nomesMeses = MESES;
export const nomesMesesCurto = MESES_CURTO;