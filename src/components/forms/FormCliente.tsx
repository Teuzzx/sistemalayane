"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { salvarCliente, type Estado } from "@/actions/clientes";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { Icone } from "@/components/Icone";
import { Aviso, Campo } from "@/components/ui";

type Dados = {
  id?: string;
  nome?: string;
  nomeFantasia?: string | null;
  cnpj?: string | null;
  cpf?: string | null;
  setorPublico?: boolean;
  contatoNome?: string | null;
  contatoCargo?: string | null;
  contatoEmail?: string | null;
  contatoTelefone?: string | null;
  whatsapp?: string | null;
  segmento?: string | null;
  porte?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  uf?: string | null;
  status?: string;
  origem?: string | null;
  observacoes?: string | null;
};

const STATUS = [
  { v: "potencial", r: "Potencial" },
  { v: "ativo", r: "Ativo" },
  { v: "inativo", r: "Inativo" },
  { v: "arquivado", r: "Arquivado" },
];

const SEGMENTOS = [
  "Indústria",
  "Comércio e serviços",
  "Construção civil",
  "Agronegócio",
  "Setor público",
  "Prefeitura",
  "Órgão estadual/federal",
  "Engenharia e projetos",
  "Energia",
  "Outro",
];

const PORTES = ["Pequeno", "Médio", "Grande"];

export function FormCliente({ dados }: { dados?: Dados }) {
  const [estado, acao] = useActionState<Estado, FormData>(salvarCliente, {});
  const [pessoaFisica, setPessoaFisica] = useState(!dados?.cnpj && !!dados?.cpf);

  return (
    <form action={acao} className="flex flex-col gap-7">
      {dados?.id && <input type="hidden" name="id" value={dados.id} />}

      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.ok && <Aviso tipo="ok">{estado.ok}</Aviso>}

      {/* --- Identificação --- */}
      <Bloco titulo="Identificação" descricao="Quem é o cliente.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Razão social / nome" htmlFor="nome" obrigatorio className="sm:col-span-2">
            <input id="nome" name="nome" required defaultValue={dados?.nome ?? ""} className="field" />
          </Campo>

          <Campo rotulo="Nome fantasia" htmlFor="nomeFantasia">
            <input id="nomeFantasia" name="nomeFantasia" defaultValue={dados?.nomeFantasia ?? ""} className="field" />
          </Campo>

          <Campo rotulo="Tipo de cliente">
            <div className="flex gap-2">
              <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xs border border-line-strong px-3 py-2.5 text-[0.8125rem] has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
                <input
                  type="radio"
                  name="tipoPessoa"
                  value="pj"
                  className="accent-deep"
                  checked={!pessoaFisica}
                  onChange={() => setPessoaFisica(false)}
                />
                Pessoa jurídica
              </label>
              <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xs border border-line-strong px-3 py-2.5 text-[0.8125rem] has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
                <input
                  type="radio"
                  name="tipoPessoa"
                  value="pf"
                  className="accent-deep"
                  checked={pessoaFisica}
                  onChange={() => setPessoaFisica(true)}
                />
                Pessoa física
              </label>
            </div>
          </Campo>

          {pessoaFisica ? (
            <Campo rotulo="CPF" htmlFor="cpf">
              <input id="cpf" name="cpf" inputMode="numeric" defaultValue={dados?.cpf ?? ""} className="field" />
            </Campo>
          ) : (
            <Campo rotulo="CNPJ" htmlFor="cnpj">
              <input id="cnpj" name="cnpj" inputMode="numeric" defaultValue={dados?.cnpj ?? ""} className="field" />
            </Campo>
          )}

          <Campo rotulo="Setor público" htmlFor="setorPublico" dica="Prefeituras e órgãos mudam prazo e forma de contrato.">
            <label className="flex h-11 cursor-pointer items-center gap-2.5 rounded-xs border border-line-strong px-3">
              <input
                id="setorPublico"
                name="setorPublico"
                type="checkbox"
                value="true"
                defaultChecked={dados?.setorPublico}
                className="size-4 accent-deep"
              />
              <span className="text-[0.875rem]">É município ou órgão público</span>
            </label>
          </Campo>
        </div>
      </Bloco>

      {/* --- Contato --- */}
      <Bloco titulo="Contato" descricao="Com quem a Layane fala.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Nome do contato" htmlFor="contatoNome">
            <input id="contatoNome" name="contatoNome" defaultValue={dados?.contatoNome ?? ""} className="field" />
          </Campo>

          <Campo rotulo="Cargo" htmlFor="contatoCargo">
            <input id="contatoCargo" name="contatoCargo" defaultValue={dados?.contatoCargo ?? ""} className="field" />
          </Campo>

          <Campo rotulo="E-mail" htmlFor="contatoEmail">
            <input id="contatoEmail" name="contatoEmail" type="email" defaultValue={dados?.contatoEmail ?? ""} className="field" />
          </Campo>

          <Campo rotulo="Telefone" htmlFor="contatoTelefone">
            <input id="contatoTelefone" name="contatoTelefone" inputMode="tel" defaultValue={dados?.contatoTelefone ?? ""} className="field" />
          </Campo>

          <Campo rotulo="WhatsApp" htmlFor="whatsapp" dica="Só números, com DDD.">
            <input id="whatsapp" name="whatsapp" inputMode="tel" defaultValue={dados?.whatsapp ?? ""} className="field" />
          </Campo>

          <Campo rotulo="Origem" htmlFor="origem" dica="Como o cliente chegou até você.">
            <input id="origem" name="origem" defaultValue={dados?.origem ?? ""} className="field" placeholder="Indicação, site, evento…" />
          </Campo>
        </div>
      </Bloco>

      {/* --- Classificação --- */}
      <Bloco titulo="Classificação" descricao="Ajuda nos filtros e nos relatórios.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo rotulo="Segmento" htmlFor="segmento">
            <select id="segmento" name="segmento" defaultValue={dados?.segmento ?? ""} className="field">
              <option value="">—</option>
              {SEGMENTOS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Campo>

          <Campo rotulo="Porte" htmlFor="porte">
            <select id="porte" name="porte" defaultValue={dados?.porte ?? ""} className="field">
              <option value="">—</option>
              {PORTES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Campo>

          <Campo rotulo="Situação" htmlFor="status">
            <select id="status" name="status" defaultValue={dados?.status ?? "potencial"} className="field">
              {STATUS.map((s) => (
                <option key={s.v} value={s.v}>{s.r}</option>
              ))}
            </select>
          </Campo>

          <Campo rotulo="Endereço" htmlFor="endereco" className="sm:col-span-2">
            <input id="endereco" name="endereco" defaultValue={dados?.endereco ?? ""} className="field" />
          </Campo>

          <Campo rotulo="Cidade" htmlFor="cidade">
            <input id="cidade" name="cidade" defaultValue={dados?.cidade ?? ""} className="field" />
          </Campo>

          <Campo rotulo="UF" htmlFor="uf">
            <input id="uf" name="uf" maxLength={2} defaultValue={dados?.uf ?? ""} className="field" placeholder="PI" />
          </Campo>
        </div>
      </Bloco>

      {/* --- Observações --- */}
      <Bloco titulo="Observações" descricao="Contexto que não cabe em campo.">
        <Campo rotulo="Anotações internas" htmlFor="observacoes">
          <textarea
            id="observacoes"
            name="observacoes"
            rows={5}
            defaultValue={dados?.observacoes ?? ""}
            className="field"
            placeholder="Histórico, peculiaridades, quem decide, como a demanda chegou…"
          />
        </Campo>
      </Bloco>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
        <BotaoEnviar variante="primario">
          {dados?.id ? "Salvar alterações" : "Cadastrar cliente"}
          <Icone nome="seta" tamanho={16} className="seta" />
        </BotaoEnviar>
        <Link
          href={dados?.id ? `/clientes/${dados.id}` : "/clientes"}
          className="text-[0.8125rem] text-muted hover:text-ink"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}

function Bloco({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <header className="border-b border-line pb-2.5">
        <h2 className="text-[0.9375rem] font-600">{titulo}</h2>
        <p className="mt-0.5 text-[0.8125rem] text-faint">{descricao}</p>
      </header>
      <div className="mt-4">{children}</div>
    </section>
  );
}