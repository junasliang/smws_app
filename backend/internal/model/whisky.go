package model

type Whisky struct {
	CaskNo           string
	CaskNoNormalized string
	NameEn           *string
	NameZh           *string
	FlavorProfile    *string
	ABV              *float64
	AgeText          *string
	AgeYears         *int
	DistillationDate *string
	InitialCask      *string
	FinishingCask    *string
	Series           *string
	Region           *string
	PriceTWD         *int
	IsAvailable      *bool
	TastingNotes     *string
	SourceURL        string
}

type WhiskySummary struct {
	CaskNo      string   `json:"cask_no"`
	NameEn      *string  `json:"name_en"`
	NameZh      *string  `json:"name_zh"`
	ABV         *float64 `json:"abv"`
	AgeText     *string  `json:"age_text"`
	AgeYears    *int     `json:"age_years"`
	Region      *string  `json:"region"`
	PriceTWD    *int     `json:"price_twd"`
	IsAvailable *bool    `json:"is_available"`
}

type WhiskyDetail struct {
	WhiskySummary
	FlavorProfile    *string `json:"flavor_profile"`
	DistillationDate *string `json:"distillation_date"`
	InitialCask      *string `json:"initial_cask"`
	FinishingCask    *string `json:"finishing_cask"`
	Series           *string `json:"series"`
	TastingNotes     *string `json:"tasting_notes"`
	SourceURL        string  `json:"source_url"`
}

type WhiskySearchResponse struct {
	Query string          `json:"query"`
	Total int             `json:"total"`
	Items []WhiskySummary `json:"items"`
}

func (w Whisky) Summary() WhiskySummary {
	return WhiskySummary{
		CaskNo:      w.CaskNo,
		NameEn:      w.NameEn,
		NameZh:      w.NameZh,
		ABV:         w.ABV,
		AgeText:     w.AgeText,
		AgeYears:    w.AgeYears,
		Region:      w.Region,
		PriceTWD:    w.PriceTWD,
		IsAvailable: w.IsAvailable,
	}
}

func (w Whisky) Detail() WhiskyDetail {
	return WhiskyDetail{
		WhiskySummary:    w.Summary(),
		FlavorProfile:    w.FlavorProfile,
		DistillationDate: w.DistillationDate,
		InitialCask:      w.InitialCask,
		FinishingCask:    w.FinishingCask,
		Series:           w.Series,
		TastingNotes:     w.TastingNotes,
		SourceURL:        w.SourceURL,
	}
}
