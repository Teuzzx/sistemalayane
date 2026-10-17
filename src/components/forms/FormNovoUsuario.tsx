"use client";

import { useActionState, useState } from "react";

import {
  criarUsuario,
  salvarPermissoes,
  trocarMinhaSenha,
  type EstadoForm as Estado,
} from "@/actions/auth";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { CampoSenha } from "@/components/CampoSenha";
import { Icone } from "@/components/Icone";
import { Aviso, Campo } from "@/components/ui";
import { RESUMO_SECAO, ROTULO_SECAO, SECOES } from "@/lib/permissoes";

export function FormNovoUsuario() {
  const [estado, acao] = useActionState<Estado, FormData>(criarUsuario, {});
  const [ehAdmin, setEhAdmin] = useState(false);

  return (
    <form action={acao} className="flex flex-col gap-5">
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.ok && <Aviso tipo="ok">{estado.ok}</Aviso>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Campo rotulo="Nome" htmlFor="nome" obrigatorio>
          <input id="nome" name="nome" required className="field" />
        </Campo>

        <Campo rotulo="E-mail" htmlFor="email" obrigatorio>
          <input id="email" name="email" type="email" required className="field" />
        </Campo>

        <Campo rotulo="Cargo" htmlFor="cargo">
          <input id="cargo" name="cargo" className="field" placeholder="Administrativo" />
        </Campo>

        <CampoSenha nome="senha" rotulo="Senha inicial" obrigatorio />

        <Campo rotulo="Papel" htmlFor="papel" className="lg:col-span-2">
          <select
            id="papel"
            name="papel"
            defaultValue="assistente"
            className="field"
            onChange={(e) => setEhAdmin(e.target.value === "admin")}
          >
            <option value="assistente">Assistente — acesso por seção</option>
            <option value="admin">Administradora — acesso total</option>
          </select>
        </Campo>
      </div>

      {/*
        As caixas só aparecem para assistente, porque a marcação não
        tem efeito nenhum em admin — que tem tudo sempre. Deixar as duas
        visíveis ensinaria que aadministradora tem um menu de permissões
        que na prática não existe.
      */}
      {!ehAdmin && <SeletorSecoes />}

      <BotaoEnviar variante="secundario">
        Criar acesso
        <Icone nome="mais" tamanho={15} />
      </BotaoEnviar>
    </form>
  );
}

/**
 * Grade de permissões.
 *
 * Um checkbox por seção, com o resumo do que ela libera embaixo do nome.
 * A Layane precisa decidir isso lendo, não decorando o sistema — e a
 * lista sai marcada no mesmo estado da tela de criação, para quem cria
 * um acesso já nascer com o essencial e só desligar o que não for usar.
 */
function SeletorSecoes({
  padrao,
}: {
  padrao?: readonly string[];
}) {
  const marcadas = padrao ?? SECOES.filter((s) => s !== "contratos" && s !== "conformidade");

  return (
    <fieldset className="border-t border-line pt-5">
      <legend className="label mb-1">O que essa pessoa pode usar</legend>
      <p className="mb-4 text-[0.8125rem] leading-relaxed text-muted">
        Desmarque o que não for parte do trabalho dela. Acesso que não
        existe na lateral também não abre pela URL — a bloqueio é feito no
        servidor.
      </p>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {SECOES.map((secao) => (
          <label
            key={secao}
            className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-deep/40 p-3 transition-colors hover:border-line-strong has-[:checked]:border-accent/60 has-[:checked]:bg-accent/5"
          >
            <input
              type="checkbox"
              name="permissoes"
              value={secao}
              defaultChecked={marcadas.includes(secao)}
              className="mt-0.5 size-4 shrink-0 accent-[var(--color-accent)]"
            />
            <span className="min-w-0">
              <span className="block text-[0.875rem] font-500">
                {ROTULO_SECAO[secao]}
              </span>
              <span className="mt-0.5 block text-[0.8125rem] leading-snug text-muted">
                {RESUMO_SECAO[secao]}
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Edição das permissões de um acesso que já existe.
 *
 * Formulário separado do de criação porque a lista é uma tabela com
 * Server Action própria — mexer nas permissões não devolve o formulário
 * de criação inteiro na tela.
 */
export function FormPermissoes({
  usuarioId,
  nome,
  permissoes,
}: {
  usuarioId: string;
  nome: string;
  permissoes: string[];
}) {
  const [estado, acao] = useActionState<Estado, FormData>(salvarPermissoes, {});

  return (
    <form action={acao} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={usuarioId} />
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.ok && <Aviso tipo="ok">{estado.ok}</Aviso>}

      <SeletorSecoes padrao={permissoes} />

      <BotaoEnviar variante="secundario">
        Salvar permissões de {nome.split(" ")[0]}
      </BotaoEnviar>
    </form>
  );
}

export function FormTrocaSenha() {
  const [estado, acao] = useActionState<Estado, FormData>(trocarMinhaSenha, {});

  return (
    <form action={acao} className="flex flex-wrap items-end gap-3">
      {estado.erro && (
        <div className="w-full">
          <Aviso tipo="erro">{estado.erro}</Aviso>
        </div>
      )}
      {estado.ok && (
        <div className="w-full">
          <Aviso tipo="ok">{estado.ok}</Aviso>
        </div>
      )}

      <Campo rotulo="Senha atual" htmlFor="atual" obrigatorio className="w-[200px]">
        <input
          id="atual"
          name="atual"
          type="password"
          required
          autoComplete="current-password"
          className="field"
        />
      </Campo>

      <div className="w-[240px]">
        <CampoSenha nome="nova" rotulo="Nova senha" obrigatorio />
      </div>

      <BotaoEnviar variante="secundario">Trocar senha</BotaoEnviar>
    </form>
  );
}
