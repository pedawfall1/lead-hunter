import type { Criterio, Sinais } from "./types";

export type LinhaCsv = {
  nome: string;
  telefone: string | null;
  endereco: string | null;
  instagram: string | null;
  sinais: Sinais;
};

export type ResultadoCsv = {
  linhas: LinhaCsv[];
  erros: string[];
  colunasReconhecidas: string[];
  colunasIgnoradas: string[];
};

type CampoBase = "nome" | "telefone" | "endereco" | "instagram";

const ALIASES: Record<CampoBase, string[]> = {
  nome: ["nome", "empresa", "nome da empresa", "razao social", "name", "title"],
  telefone: ["telefone", "fone", "celular", "whatsapp", "zap", "phone", "tel"],
  endereco: ["endereco", "address", "local", "localizacao", "rua"],
  instagram: ["instagram", "insta", "ig", "arroba", "perfil"],
};

/** Coluna herdada da v1: tem_site=nao vira o sinal sem_site. */
const ALIASES_TEM_SITE = ["tem_site", "tem site", "site", "website", "possui site", "url"];

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/["']/g, "")
    .trim()
    .toLowerCase();
}

function detectarDelimitador(primeiraLinha: string): string {
  const candidatos = [";", ",", "\t", "|"];
  let melhor = ",";
  let max = 0;
  for (const c of candidatos) {
    const n = primeiraLinha.split(c).length - 1;
    if (n > max) {
      max = n;
      melhor = c;
    }
  }
  return melhor;
}

/** Tokenizador CSV com suporte a aspas duplas e quebras de linha dentro do campo. */
function tokenizar(texto: string, delim: string): string[][] {
  const linhas: string[][] = [];
  let campo = "";
  let linha: string[] = [];
  let dentroAspas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];

    if (dentroAspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          dentroAspas = false;
        }
      } else {
        campo += c;
      }
      continue;
    }

    if (c === '"') {
      dentroAspas = true;
    } else if (c === delim) {
      linha.push(campo);
      campo = "";
    } else if (c === "\n") {
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = "";
    } else if (c === "\r") {
      // ignora: tratado no \n
    } else {
      campo += c;
    }
  }

  if (campo.length > 0 || linha.length > 0) {
    linha.push(campo);
    linhas.push(linha);
  }

  return linhas;
}

const VERDADEIROS = ["sim", "s", "true", "t", "1", "x", "yes", "y", "v", "tem"];
const FALSOS = ["nao", "n", "false", "f", "0", "", "-", "sem", "nenhum"];

function parseBooleano(valor: string): boolean {
  const v = normalizar(valor);
  if (VERDADEIROS.includes(v)) return true;
  if (FALSOS.includes(v)) return false;
  // Se veio uma URL na coluna "site", conta como "tem site".
  if (/\.[a-z]{2,}/i.test(v)) return true;
  return false;
}

/**
 * @param criterios critérios do projeto — colunas com o mesmo nome (chave ou
 *   rótulo) viram sinais do lead. Ex.: uma coluna "parado_30d" com sim/não.
 */
export function parseCsv(
  textoBruto: string,
  criterios: Criterio[] = []
): ResultadoCsv {
  const erros: string[] = [];
  const texto = textoBruto.replace(/^\ufeff/, "").trim();

  if (!texto) {
    return { linhas: [], erros: ["Arquivo vazio."], colunasReconhecidas: [], colunasIgnoradas: [] };
  }

  const delim = detectarDelimitador(texto.split("\n")[0] ?? "");
  const bruto = tokenizar(texto, delim).filter((l) => l.some((c) => c.trim() !== ""));

  if (bruto.length < 2) {
    return {
      linhas: [],
      erros: ["O arquivo precisa de uma linha de cabeçalho e ao menos um lead."],
      colunasReconhecidas: [],
      colunasIgnoradas: [],
    };
  }

  const cabecalho = bruto[0].map(normalizar);
  const usados = new Set<number>();
  const reconhecidas: string[] = [];

  const reservar = (nomes: string[]): number | undefined => {
    const idx = cabecalho.findIndex((h, i) => !usados.has(i) && nomes.includes(h));
    if (idx < 0) return undefined;
    usados.add(idx);
    reconhecidas.push(bruto[0][idx].trim());
    return idx;
  };

  const indices: Partial<Record<CampoBase, number>> = {};
  (Object.keys(ALIASES) as CampoBase[]).forEach((campo) => {
    indices[campo] = reservar(ALIASES[campo]);
  });

  const idxTemSite = reservar(ALIASES_TEM_SITE);

  // colunas de sinal: casam pela chave ou pelo rótulo do critério
  const colunasSinal: { idx: number; chave: string }[] = [];
  for (const c of criterios) {
    const idx = reservar([normalizar(c.chave), normalizar(c.label)]);
    if (idx !== undefined) colunasSinal.push({ idx, chave: c.chave });
  }

  const ignoradas = bruto[0]
    .map((h, i) => (usados.has(i) ? null : h.trim()))
    .filter((h): h is string => !!h);

  if (indices.nome === undefined) {
    erros.push(
      'Não encontrei a coluna "nome" no cabeçalho. Colunas esperadas: nome, telefone, endereco, tem_site, instagram.'
    );
    return { linhas: [], erros, colunasReconhecidas: reconhecidas, colunasIgnoradas: ignoradas };
  }

  const pegar = (linha: string[], i: number | undefined): string =>
    i === undefined ? "" : (linha[i] ?? "").trim();

  const linhas: LinhaCsv[] = [];

  bruto.slice(1).forEach((l, i) => {
    const nome = pegar(l, indices.nome);
    if (!nome) {
      erros.push(`Linha ${i + 2}: sem nome, pulei.`);
      return;
    }

    const sinais: Sinais = {};
    if (idxTemSite !== undefined && !parseBooleano(pegar(l, idxTemSite))) {
      sinais.sem_site = true;
    }
    for (const { idx, chave } of colunasSinal) {
      if (parseBooleano(pegar(l, idx))) sinais[chave] = true;
    }

    const instagram = pegar(l, indices.instagram);
    linhas.push({
      nome,
      telefone: pegar(l, indices.telefone) || null,
      endereco: pegar(l, indices.endereco) || null,
      instagram: instagram ? instagram.replace(/^@/, "") : null,
      sinais,
    });
  });

  return { linhas, erros, colunasReconhecidas: reconhecidas, colunasIgnoradas: ignoradas };
}

export const CSV_EXEMPLO = `nome,telefone,endereco,tem_site,instagram
Advocacia Silva,49999887766,"Rua Brasil, 120 - Centro, Videira - SC",nao,@advocaciasilva
Barbearia do Zé,4933441122,"Av. Manoel Roque, 45 - Bairro Universitário, Videira - SC",sim,
`;
