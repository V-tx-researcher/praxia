// Tesauro de expansão de consultas (domínio do exercício profissional do Serviço Social).
// Cada grupo liga termos de uso cotidiano a termos usados nas normas. A expansão
// apenas amplia a recuperação; termos expandidos têm peso menor que os digitados.
// Lista revisável: alterações devem ser registradas em docs/DECISIONS.md.

export const GRUPOS = [
  ["sigilo", "sigiloso", "segredo", "confidencial", "confidencialidade", "revelar", "revelação", "quebra"],
  ["prontuário", "registro", "documentação", "arquivo", "arquivos", "material técnico", "lacração", "lacrar"],
  ["laudo", "parecer", "perícia", "perito", "estudo social", "relatório", "documento técnico"],
  ["estágio", "estagiário", "estagiária", "supervisão", "supervisor", "supervisora", "aluno", "aluna", "estudante"],
  ["atribuição", "atribuições", "privativa", "privativo", "competência", "competências", "função"],
  ["condições", "condição", "condigna", "condignas", "espaço físico", "sala", "privacidade", "ambiente"],
  ["denúncia", "denunciar", "representação", "queixa", "reclamação"],
  ["infração", "infrações", "violação", "transgressão", "falta ética", "penalidade", "punição", "sanção"],
  ["chefia", "chefe", "gestor", "gestora", "coordenação", "superior", "empregador", "empregadora", "instituição"],
  ["determinação", "ordem", "exigência", "imposição", "solicitação", "exige", "exigem", "exigir",
    "obriga", "obrigam", "determina", "manda", "acatar"],
  ["jornada", "carga horária", "horas semanais", "30 horas", "trinta horas", "duração do trabalho"],
  ["testemunha", "depor", "depoimento", "justiça", "juiz", "juíza", "audiência", "intimado", "intimada"],
  ["usuário", "usuária", "usuários", "população usuária", "paciente", "família", "atendido", "atendida"],
  ["autonomia", "liberdade", "independência"],
  ["fiscalização", "fiscalizar", "cofi", "comissão de orientação e fiscalização"],
  ["registro profissional", "inscrição", "carteira", "cress"],
  ["discriminação", "preconceito", "discriminar", "orientação sexual", "identidade de gênero"],
  ["exercício ilegal", "leigo", "não habilitado", "sem registro"],
  ["multidisciplinar", "interdisciplinar", "equipe", "outros profissionais"],
  // 28/10/2026 — a partir das falhas da avaliação com o acervo completo.
  ["gravação", "gravar", "gravado", "áudio", "vídeo", "filmagem", "filmar", "audiovisual", "imagem"],
  ["substituir", "substituição", "substituto", "substituta", "continuidade"],
  ["penalidade", "penalidades", "pena", "penas", "sanção", "sanções", "punição"],
  ["prazo", "tempo", "duração", "dura", "período"],
  ["diploma", "diplomado", "diplomada", "formado", "formada", "graduação", "graduado", "graduada"],
  ["meta", "metas", "produtividade", "quantidade", "qualidade"],
  ["assinar", "assina", "assinatura", "subscrever", "firmar"],
  ["primeira instância", "instância", "julgar", "julgamento", "competência"],
];

import { tokens } from "./texto.js";

// Mapa: radical → conjunto de radicais relacionados.
const MAPA = new Map();
for (const grupo of GRUPOS) {
  const radicais = new Set(grupo.flatMap((t) => tokens(t)));
  for (const r of radicais) {
    if (!MAPA.has(r)) MAPA.set(r, new Set());
    for (const outro of radicais) if (outro !== r) MAPA.get(r).add(outro);
  }
}

export function expandir(radicaisConsulta) {
  const originais = new Set(radicaisConsulta);
  const extras = new Set();
  for (const r of originais) {
    for (const e of MAPA.get(r) || []) if (!originais.has(e)) extras.add(e);
  }
  return [...extras];
}

// Termos relacionados a um radical específico (sem incluir o próprio).
export function relacionados(radical) {
  return [...(MAPA.get(radical) || [])];
}
