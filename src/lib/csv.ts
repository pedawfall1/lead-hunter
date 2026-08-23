export type LinhaCsv = {
  nome: string;
  telefone: string | null;
  endereco: string | null;
  tem_site: boolean;
  instagram: string | null;
};

export type ResultadoCsv = {
  linhas: LinhaCsv[];
  erros: string[];
  colunasReconhecidas: string[];
  colunasIgnoradas: string[];
};

const ALIASES: Record<keyof LinhaCsv, string[]> = {
  nome: ["nome", "empresa", "nome da empresa", "razao social", "name", "title"],
  telefone: ["telefone", "fone", "celular", "whatsapp", "zap", "phone", "tel"],
  endereco: ["endereco", "address", "local", "localizacao", "rua"],
  tem_site: ["tem_site", "tem site", "site", "website", "possui site", "url"],
  instagram: ["instagram", "insta", "ig", "arroba", "perfil"],
};

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

export function parseCsv(textoBruto: string): ResultadoCsv {
  const erros: string[] = [];
  const texto = textoBruto.replace(/^\ufeff/, "").trim();

  if (!texto) {
    return {
      linhas: [],
      erros: ["Arquivo vazio."],
      colunasReconhecidas: [],
      colunasIgnoradas: [],
    };
  }

  const delim = detectarDelimitador(texto.split("\n")[0] ?? "");
  const bruto = tokenizar(texto, delim).filter((l) =>
    l.some((c) => c.trim() !== "")
  );

  if (bruto.length < 2) {
    return {
      linhas: [],
      erros: ["O arquivo precisa de uma linha de cabecalho e ao menos um lead."],
      colunasReconhecidas: [],
      colunasIgnoradas: [],
    };
  }

  const cabecalho = bruto[0].map(normalizar);

  // indice de cada campo no cabecalho
  const indices: Partial<Record<keyof LinhaCsv, number>> = {};
  const reconhecidas: string[] = [];
  const usados = new Set<number>();

  (Object.keys(ALIASES) as (keyof LinhaCsv)[]).forEach((campo) => {
    const idx = cabecalho.findIndex(
      (h, i) => !usados.has(i) && ALIASES[campo].includes(h)
    );
    if (idx >= 0) {
      indices[campo] = idx;
      usados.add(idx);
      reconhecidas.push(bruto[0][idx].trim());
    }
  });

  const ignoradas = bruto[0]
    .map((h, i) => (usados.has(i) ? null : h.trim()))
    .filter((h): h is string => !!h);

  if (indices.nome === undefined) {
    erros.push(
      'Nao encontrei a coluna "nome" no cabecalho. Colunas esperadas: nome, telefone, endereco, tem_site, instagram.'
    );
    return {
      linhas: [],
      erros,
      colunasReconhecidas: reconhecidas,
      colunasIgnoradas: ignoradas,
    };
  }

  const pegar = (linha: string[], campo: keyof LinhaCsv): string => {
    const i = indices[campo];
    if (i === undefined) return "";
    return (linha[i] ?? "").trim();
  };

  const linhas: LinhaCsv[] = [];

  bruto.slice(1).forEach((l, i) => {
    const nome = pegar(l, "nome");
    if (!nome) {
      erros.push(`Linha ${i + 2}: sem nome, pulei.`);
      return;
    }
    const instagram = pegar(l, "instagram");
    linhas.push({
      nome,
      telefone: pegar(l, "telefone") || null,
      endereco: pegar(l, "endereco") || null,
      tem_site: parseBooleano(pegar(l, "tem_site")),
      instagram: instagram ? instagram.replace(/^@/, "") : null,
    });
  });

  return {
    linhas,
    erros,
    colunasReconhecidas: reconhecidas,
    colunasIgnoradas: ignoradas,
  };
}

export const CSV_EXEMPLO = `nome,telefone,endereco,tem_site,instagram
Advocacia Silva,49999887766,"Rua Brasil, 120 - Centro, Videira - SC",nao,@advocaciasilva
Barbearia do Ze,4933441122,"Av. Manoel Roque, 45 - Bairro Universitario, Videira - SC",sim,
`;
