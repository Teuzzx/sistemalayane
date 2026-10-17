/**
 * Tela de banco não configurado.
 *
 * Existe por causa de um deploy que devolveu 500 em branco: sem
 * `DATABASE_URL` a aplicação não sobe, mas o Next escondia o motivo atrás
 * da página genérica de erro. Quem opera não tem como saber que o
 * problema é uma variável de ambiente.
 *
 * Aqui a tela é uma instrução, não um pedido de desculpa.
 */

const PASSOS = [
  {
    titulo: "Pegar a connection string",
    texto:
      "No painel do Supabase: Project Settings → Database → Connection string → URI. Copie a que começa com postgresql://.",
  },
  {
    titulo: "Definir a variável",
    texto:
      "Na Vercel: Settings → Environment Variables, crie DATABASE_URL e cole a string. Marque também em Production. Localmente, é a linha no .env.local.",
  },
  {
    titulo: "Criar as tabelas",
    texto:
      "Rode npm run setup uma vez, apontando para o mesmo banco. Sem as tabelas o login não funciona mesmo com a variável no lugar.",
  },
];

export function BancoNaoConfigurado() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-8 px-6 py-16">
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#a9c48a] to-[#6f8a55] text-[0.9375rem] font-700 text-[#14190f]">
          LM
        </span>
        <span>
          <span className="block text-[1.0625rem] leading-tight font-500">
            Layane Marques <span className="text-accent ml-1.5">Gestão</span>
          </span>
          <span className="block text-[0.75rem] text-muted">
            Gestão Ambiental Aplicada
          </span>
        </span>
      </div>

      <div>
        <h1 className="text-[1.75rem] leading-none font-500 tracking-[-0.012em]">
          Falta uma configuração
        </h1>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">
          O sistema não achou para onde conectar. A variável{" "}
          <code className="rounded bg-[var(--color-mineral)] px-1.5 py-0.5 text-[0.85em] text-accent">
            DATABASE_URL
          </code>{" "}
          não está definida neste ambiente — nada foi perdido, é só
          apontar o banco.
        </p>
      </div>

      <ol className="grid gap-4">
        {PASSOS.map((p, i) => (
          <li key={p.titulo} className="painel p-5 sm:p-6">
            <div className="flex items-start gap-3.5">
              <span className="tnum flex size-7 shrink-0 items-center justify-center rounded-full border border-line text-[0.8125rem] text-accent">
                {i + 1}
              </span>
              <div className="min-w-0">
                <h2 className="text-[0.9375rem] font-500">{p.titulo}</h2>
                <p className="mt-1.5 text-[0.875rem] leading-relaxed text-muted">
                  {p.texto}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <p className="text-[0.8125rem] leading-relaxed text-faint">
        Depois de definir a variável é preciso reiniciar a aplicação — na
        Vercel, um novo deploy; localmente, derrube e suba o{" "}
        <code className="text-[0.9em]">npm run dev</code>.
      </p>
    </main>
  );
}