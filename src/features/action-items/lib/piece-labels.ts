// Rótulos pt-BR do tipo de trabalho e do perfil de peça. Encanamento: mapeiam os
// valores internos do action_item (tipo, piece_profile_key) para texto de UI.
// Vivem aqui (não num componente) porque são consumidos pela unidade de trabalho
// do detalhe (use-disposicao) e pelo card da Triagem, sem carregar UI de board.

import type { ActionItemTipo } from "../types";

export const WORK_TYPES: Record<ActionItemTipo, string> = {
  cumprir: "Cumprir determinação",
  ciencia: "Tomar ciência",
  manifestar: "Manifestar-se",
  contestar: "Contestar",
  recorrer: "Recorrer",
};

export const PIECE_PROFILES: Record<string, string> = {
  "": "Não precisa de peça",
  manifestacao: "Manifestação",
  contestacao: "Contestação",
  apelacao: "Apelação",
  peticao_inicial: "Petição inicial",
};
