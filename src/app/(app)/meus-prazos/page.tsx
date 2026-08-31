import { FilaView } from "@/features/prazos/components/fila/fila-view";
import { USUARIO_ATUAL } from "@/features/prazos/mocks/prazos.mock";

export const metadata = { title: "Meus Prazos · jus·assessoria" };

export default function MeusPrazosPage() {
  return <FilaView forcarResp={USUARIO_ATUAL} titulo="Meus Prazos" />;
}
