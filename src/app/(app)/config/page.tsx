import Link from "next/link";

import { alternarAcesso, criarUsuario, revogarSessoes, trocarMinhaSenha } from "@/actions/auth";
import { FormNovoUsuario, FormTrocaSenha } from "@/components/forms/FormNovoUsuario";
import { Icone } from "@/components/Icone";
import { db } from "@/db";
import { servicos, usuarios } from "@/db/schema";
import { requireUsuario } from "@/lib/auth";
import { ehAdmin, rotuloPapel } from "@/lib/papeis";
import { formatarData } from "@/lib/dates";
import { brl } from "@/lib/money";
import {
  CabecalhoPagina,
  Etiqueta,
  LinhaDado,
  Painel,
  Vazio,
} from "@/components/ui";

export const metadata = { title: "Configurações" };

export default async function PaginaConfig() {
  const eu = await requireUsuario();
  const admin = ehAdmin(eu);

  const [listaUsuarios, catalogo] = await Promise.all([
    admin
      ? db.select().from(usuarios)
      : Promise.resolve([]),
    db.select().from(servicos),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <CabecalhoPagina
        eyebrow="Sistema"
        titulo="Configurações"
        descricao="Acessos, catálogo de serviços e a sua conta."
      />

      {/* --- Minha conta --- */}
      <Painel titulo="Sua conta" descricao="Acesso com o seu nome e e-mail.">
        <div className="flex flex-col">
          <LinhaDado rotulo="Nome" valor={eu.nome} />
          <LinhaDado rotulo="E-mail" valor={eu.email} />
          <LinhaDado rotulo="Papel" valor={rotuloPapel(eu.papel)} />
          {eu.ultimoAcessoEm && (
            <LinhaDado
              rotulo="Último acesso"
              valor={formatarData(eu.ultimoAcessoEm.slice(0, 10))}
            />
          )}
        </div>

        <div className="mt-5 border-t border-line pt-5">
          <p className="label mb-3">Trocar sua senha</p>
          <FormTrocaSenha />
        </div>
      </Painel>

      {/* --- Acessos --- */}
      {admin && (
        <Painel
          titulo="Quem tem acesso"
          descricao="Administradora vê tudo. Assistente cadastra cliente, registra atendimento e mexe no financeiro — sem ver conformidade emitida nem configurações."
        >
          <table className="tabela">
            <thead>
              <tr>
                <th>Pessoa</th>
                <th>Papel</th>
                <th>Último acesso</th>
                <th>Situação</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {listaUsuarios.map((u) => (
                <tr key={u.id}>
                  <td>
                    <p className="font-500">{u.nome}</p>
                    <p className="text-[0.8125rem] text-faint">{u.email}</p>
                  </td>
                  <td>
                    {u.papel === "admin" ? (
                      <Etiqueta tom="deep">Administradora</Etiqueta>
                    ) : (
                      <Etiqueta tom="mute">Assistente</Etiqueta>
                    )}
                  </td>
                  <td className="tnum text-muted">
                    {u.ultimoAcessoEm ? formatarData(u.ultimoAcessoEm.slice(0, 10)) : "nunca"}
                  </td>
                  <td>
                    {u.ativo ? (
                      <Etiqueta tom="ok">Ativo</Etiqueta>
                    ) : (
                      <Etiqueta tom="mute">Desligado</Etiqueta>
                    )}
                  </td>
                  <td className="num">
                    {u.id === eu.id ? (
                      <span className="text-[0.8125rem] text-faint">você</span>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <form action={revogarSessoes}>
                          <input type="hidden" name="id" value={u.id} />
                          <button type="submit" className="btn btn-fantasma">
                            <Icone nome="sair" tamanho={14} />
                            Sair de tudo
                          </button>
                        </form>
                        <form action={alternarAcesso}>
                          <input type="hidden" name="id" value={u.id} />
                          <button type="submit" className="btn btn-fantasma">
                            {u.ativo ? "Desligar" : "Religar"}
                          </button>
                        </form>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6 border-t border-line pt-5">
            <p className="label mb-3">Dar novo acesso</p>
            <FormNovoUsuario />
          </div>
        </Painel>
      )}

      {/* --- Catálogo de serviços --- */}
      <Painel
        titulo="Catálogo de serviços"
        descricao="As soluções que a Layane vende. Servem para orçamento, contrato e leitura do faturamento."
      >
        {catalogo.length === 0 ? (
          <Vazio titulo="Catálogo vazio" />
        ) : (
          <table className="tabela">
            <thead>
              <tr>
                <th>Serviço</th>
                <th>Unidade</th>
                <th className="num">Preço padrão</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {catalogo.map((s) => (
                <tr key={s.id}>
                  <td>
                    <p className="font-500">{s.nome}</p>
                    {s.descricao && (
                      <p className="text-[0.8125rem] text-faint">{s.descricao}</p>
                    )}
                  </td>
                  <td className="text-muted capitalize">{s.unidade}</td>
                  <td className="num">
                    {s.precoPadrao > 0 ? brl(s.precoPadrao) : "—"}
                  </td>
                  <td>
                    {s.ativo ? (
                      <Etiqueta tom="ok">Ativo</Etiqueta>
                    ) : (
                      <Etiqueta tom="mute">Inativo</Etiqueta>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <p className="mt-4 border-t border-line pt-4 text-[0.8125rem] text-faint">
          Preço em branco é de propósito: os valores são combinados por demanda, e o
          sistema não inventa número que você não informou.
        </p>
      </Painel>

      <div className="border-t border-line pt-5">
        <Link href="/conformidade/modelos" className="text-[0.875rem] text-accent hover:underline">
          Gerenciar questionários de conformidade →
        </Link>
      </div>
    </div>
  );
}