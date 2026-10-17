/**
 * Painel de Segurança.
 *
 * Existe porque "o sistema está protegido" não é algo que a Layane
 * consiga conferir sozinha. O painel mostra o que a camada de proteção
 * está fazendo de verdade: quem tentou entrar, quantas vezes, de que
 * endereço, e se alguém está insistindo.
 *
 * Server Component. Não há interação que justifique ir para o cliente,
 * e manter no servidor evita mandar as tentativas para o navegador.
 */

import { PANEL_SEGURANCA_NOTAS } from "@/lib/papeis";
import { JANELA_DE_TENTATIVAS_HORAS, panoramaSeguranca } from "@/lib/segurancaLeitura";
import { formatarData } from "@/lib/dates";
import { Etiqueta, LinhaDado, Painel, Vazio } from "@/components/ui";
import { configuracaoProvedor } from "@/actions/mensagens";

export async function PainelSeguranca() {
  const [p, prov] = await Promise.all([panoramaSeguranca(), configuracaoProvedor()]);

  return (
    <>
      <Painel
        titulo="Acesso e proteção"
        descricao={`Tentativas nas últimas ${JANELA_DE_TENTATIVAS_HORAS} horas.`}
        solido
      >
        <div className="flex flex-col">
          <LinhaDado
            rotulo="Tentativas com falha"
            valor={String(p.falhas)}
            detalhe={
              p.falhas === 0
                ? "Nenhuma. Bom sinal."
                : "O acesso é bloqueado por 15 minutos após 5 tentativas no mesmo e-mail, ou 20 vindas do mesmo endereço."
            }
          />
          <LinhaDado rotulo="Logins certos" valor={String(p.sucessos)} />
          <LinhaDado
            rotulo="Sessões abertas"
            valor={String(p.sessoesAbertas)}
            detalhe="Sessões ativas agora. Um acesso que você não reconhece é derrubado em Configurações › Acessos."
          />
        </div>

        <div className="mt-5">
          <h3 className="mb-2 text-[0.8125rem] font-600 text-bright">
            O que já está protegido
          </h3>
          <ul className="grid gap-1.5">
            {PANEL_SEGURANCA_NOTAS.map((n) => (
              <li key={n} className="flex gap-2 text-[0.8125rem] leading-relaxed text-muted">
                <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ok" />
                {n}
              </li>
            ))}
          </ul>
        </div>
      </Painel>

      {p.sobAtaque.length > 0 && (
        <Painel
          titulo="E-mails sob ataque"
          descricao="Três ou mais tentativas com senha errada na janela. Se não for você, troque a senha."
        >
          <div className="flex flex-col gap-2">
            {p.sobAtaque.map((a) => (
              <div key={a.email} className="flex items-center justify-between gap-3 text-[0.8125rem]">
                <span className="text-bright">{a.email}</span>
                <Etiqueta tom="danger">{a.n} tentativas</Etiqueta>
              </div>
            ))}
          </div>
        </Painel>
      )}

      <Painel
        titulo="E-mail de saída"
        descricao="Quem recebe e de onde sai."
      >
        <div className="flex flex-col">
          <LinhaDado
            rotulo="Provedor"
            valor={prov.configurado ? "Resend — ativo" : "Não configurado"}
          />
          <LinhaDado rotulo="Remetente" valor={prov.remetente} />
          <LinhaDado rotulo="Responder para" valor={prov.respostaPara} />
          <LinhaDado
            rotulo="Situação"
            valor={prov.configurado ? "Enviando" : "Mensagens ficam como rascunho"}
          />
        </div>

        {!prov.configurado && (
          <p className="mt-4 text-[0.8125rem] leading-relaxed text-muted">
            Para o e-mail sair de verdade, crie uma conta no{" "}
            <a
              href="https://resend.com"
              target="_blank"
              rel="noreferrer"
              className="text-bright underline underline-offset-2"
            >
              Resend
            </a>
            , verifique o domínio <strong>layanemarques.com.br</strong> e
            coloque a chave em <code className="text-bright">RESEND_API_KEY</code>{" "}
            no arquivo <code className="text-bright">.env.local</code>. Depois
            reinicie o servidor.
          </p>
        )}
      </Painel>

      <Painel
        titulo="Últimas tentativas"
        descricao="Os acessos mais recentes, certos e errados."
      >
        {p.recentes.length === 0 ? (
          <Vazio
            titulo="Nenhuma tentativa registrada"
            texto="Assim que alguém entrar — com sucesso ou não — aparece aqui."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="tabela tabela-compacta">
              <thead>
                <tr>
                  <th>E-mail</th>
                  <th>Endereço</th>
                  <th>Resultado</th>
                  <th>Quando</th>
                </tr>
              </thead>
              <tbody>
                {p.recentes.map((t, i) => (
                  <tr key={`${t.criadoEm}_${i}`}>
                    <td className="max-w-[26ch] truncate">{t.email}</td>
                    <td className="tnum text-[0.75rem] text-faint">{t.ip ?? "—"}</td>
                    <td>
                      <Etiqueta tom={t.sucesso ? "ok" : "danger"}>
                        {t.sucesso ? "Entrou" : t.motivo === "inexistente" ? "E-mail não existe" : "Senha errada"}
                      </Etiqueta>
                    </td>
                    <td className="whitespace-nowrap tnum text-[0.8125rem]">
                      {formatarData(t.criadoEm)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Painel>
    </>
  );
}
