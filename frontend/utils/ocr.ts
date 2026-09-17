export interface OcrCandidate {
  query: string;
  source: "cask_no" | "name";
}

const CASK_WITH_SEPARATOR = /\b(\d{1,3})\s*[.\-:]\s*(\d{1,4})\b/;
const CASK_WITH_SPACE = /\b(\d{1,3})\s+(\d{2,4})\b/;

function normalizeLine(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractBestWhiskyQuery(lines: string[]): OcrCandidate | null {
  const normalizedLines = lines.map(normalizeLine).filter(Boolean);
  const fullText = normalizedLines.join(" ");

  const separated = fullText.match(CASK_WITH_SEPARATOR);
  if (separated) {
    return {
      query: `${separated[1]}.${separated[2]}`,
      source: "cask_no",
    };
  }

  const spaced = fullText.match(CASK_WITH_SPACE);
  if (spaced) {
    return {
      query: `${spaced[1]}.${spaced[2]}`,
      source: "cask_no",
    };
  }

  const nameCandidates = normalizedLines
    .filter((line) => !/^SMWS$/i.test(line))
    .filter((line) => /[A-Za-z\u3400-\u9FFF]/.test(line))
    .filter((line) => line.length >= 4 && line.length <= 120)
    .sort((a, b) => b.length - a.length);

  if (nameCandidates.length > 0) {
    return {
      query: nameCandidates[0],
      source: "name",
    };
  }

  return null;
}
