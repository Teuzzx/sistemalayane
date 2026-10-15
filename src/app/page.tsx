import { redirect } from "next/navigation";

import { getUsuario } from "@/lib/auth";

export default async function Raiz() {
  const usuario = await getUsuario();
  redirect(usuario ? "/painel" : "/login");
}