import type { DqCategory } from "@/types/index";

const CATEGORY_CODES: Record<DqCategory, string> = {
  puntuale: "fld",
  intra_entita: "ent",
  cross_entita: "xref",
};

const DIMENSION_CODES: Record<string, string> = {
  Accuratezza: "acc",
  Completezza: "cmp",
  Consistenza: "cns",
  Tempestività: "tim",
  Unicità: "unq",
  Validità: "vld",
};

const DQ_CODE_PATTERN = /^(fld|ent|xref)__(acc|cmp|cns|tim|unq|vld)__[a-z0-9]+(?:_[a-z0-9]+)*__[a-z0-9]+(?:_[a-z0-9]+)*$/;

export function validateDqCode(
  code: string,
  category: DqCategory,
  dimensionName: string,
): string | null {
  if (!DQ_CODE_PATTERN.test(code)) {
    return "Formato richiesto: <categoria>__<dimensione>__<contesto>__<regola> in snake_case minuscolo";
  }

  const [categoryCode, dimensionCode] = code.split("__");
  if (categoryCode !== CATEGORY_CODES[category]) {
    return "Il prefisso non corrisponde alla categoria selezionata";
  }
  if (dimensionCode !== DIMENSION_CODES[dimensionName]) {
    return "La dimensione nel codice non corrisponde a quella selezionata";
  }
  return null;
}

export function validateSodaUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") return null;
  } catch {
    return "Inserisci un URL SODA valido (http o https)";
  }
  return "Inserisci un URL SODA valido (http o https)";
}