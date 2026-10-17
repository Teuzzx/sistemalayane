import "server-only";

import { redirect } from "next/navigation";

import type { Usuario } from "@/db/schema";
import { requireUsuario } from "@/lib/auth";
import { ehAdmin, type Secao, podeAcessar } from "@/lib/permissoes";

/**
 * Exige a seção no servidor, ou manda a pessoa para o painel.
 *
 * Toda página interna chama isto antes de qualquer consulta. Sem isso,
 * esconder o link na lateral não impede nada: trocar `/clientes` por
 * `/financeiro` na barra de endereço abre a tela. A lateral é
 * conveniência; esta função é a fechadura.
 *
 * `admin` passa sempre — a Layane não pode se trancar fora.
 */
export async function exigirSecao(secao: Secao): Promise<Usuario> {
  const usuario = await requireUsuario();
  if (!ehAdmin(usuario) && !podeAcessar(usuario, secao)) {
    redirect(`/painel?erro=sem-acesso-${secao}`);
  }
  return usuario;
}