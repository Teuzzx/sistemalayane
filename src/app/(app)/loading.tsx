import { Esqueleto } from "@/components/Esqueleto";

/**
 * Envolve TODAS as rotas internas do sistema (painel, clientes, financeiro,
 * contratos, conformidade…). O Next.js mostra este esqueleto durante a ida
 * e a volta do servidor, então a barra lateral e o fundo de vídeo já estão
 * na tela — só o conteúdo troca.
 */
export default function Carregando() {
  return <Esqueleto />;
}