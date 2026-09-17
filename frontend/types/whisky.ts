export interface WhiskySummary {
  cask_no: string;
  name_en: string | null;
  name_zh: string | null;
  abv: number | null;
  age_text: string | null;
  age_years: number | null;
  region: string | null;
  price_twd: number | null;
  is_available: boolean | null;
}

export interface WhiskyDetail extends WhiskySummary {
  flavor_profile: string | null;
  distillation_date: string | null;
  initial_cask: string | null;
  finishing_cask: string | null;
  series: string | null;
  tasting_notes: string | null;
  source_url: string;
}

export interface WhiskySearchResponse {
  query: string;
  total: number;
  items: WhiskySummary[];
}

export interface ScanResponse {
  status: "matched" | "no_cask" | "not_found";
  matched: boolean;
  cask_no: string | null;
  detected_candidates: string[];
  ocr_texts: string[];
  whisky: WhiskySummary | null;
}