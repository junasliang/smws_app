package service

import (
	"context"
	"sort"
	"strings"

	"smws-api/internal/model"
	"smws-api/internal/normalize"
	"smws-api/internal/repository"
)

type WhiskyService struct {
	repository *repository.WhiskyRepository
}

func NewWhiskyService(repository *repository.WhiskyRepository) *WhiskyService {
	return &WhiskyService{repository: repository}
}

func (s *WhiskyService) GetByCaskNo(ctx context.Context, caskNo string) (model.WhiskyDetail, error) {
	item, err := s.repository.GetByCaskNo(ctx, caskNo)
	if err != nil {
		return model.WhiskyDetail{}, err
	}
	return item.Detail(), nil
}

func (s *WhiskyService) Search(ctx context.Context, query string, limit int) (model.WhiskySearchResponse, error) {
	query = strings.TrimSpace(query)
	response := model.WhiskySearchResponse{
		Query: query,
		Items: make([]model.WhiskySummary, 0),
	}
	if query == "" {
		return response, nil
	}

	// Preserve the Python service's fast path: exact normalized cask wins.
	exact, err := s.repository.GetByCaskNo(ctx, query)
	if err == nil {
		response.Items = []model.WhiskySummary{exact.Summary()}
		response.Total = 1
		return response, nil
	}
	if err != repository.ErrNotFound {
		return response, err
	}

	candidates, err := s.repository.SearchCandidates(ctx, query, 100)
	if err != nil {
		return response, err
	}
	if len(candidates) == 0 {
		// Same strategy as the Python service: fuzzy fallback over the local
		// catalogue. The score is intentionally lightweight rather than a
		// bit-for-bit RapidFuzz WRatio port.
		candidates, err = s.repository.ListAll(ctx, 500)
		if err != nil {
			return response, err
		}
	}

	rank(query, candidates)
	if len(candidates) > limit {
		candidates = candidates[:limit]
	}

	response.Items = make([]model.WhiskySummary, 0, len(candidates))
	for _, item := range candidates {
		response.Items = append(response.Items, item.Summary())
	}
	response.Total = len(response.Items)
	return response, nil
}

func rank(query string, items []model.Whisky) {
	normalizedQuery := normalize.Text(query)
	normalizedCask := normalize.CaskNo(query)

	type scored struct {
		item  model.Whisky
		score float64
	}

	scoredItems := make([]scored, 0, len(items))
	for _, item := range items {
		score := 0.0
		for _, value := range []string{
			valueOrEmpty(item.NameEn),
			valueOrEmpty(item.NameZh),
			item.CaskNo,
		} {
			value = normalize.Text(value)
			if value == "" {
				continue
			}
			candidateScore := similarity(normalizedQuery, value)
			if candidateScore > score {
				score = candidateScore
			}
		}

		if normalizedCask != "" && normalizedCask == item.CaskNoNormalized {
			score += 25
		}

		scoredItems = append(scoredItems, scored{item: item, score: score})
	}

	sort.SliceStable(scoredItems, func(i, j int) bool {
		return scoredItems[i].score > scoredItems[j].score
	})
	for i := range scoredItems {
		items[i] = scoredItems[i].item
	}
}

func similarity(a, b string) float64 {
	if a == b {
		return 100
	}
	if a == "" || b == "" {
		return 0
	}
	if strings.Contains(b, a) || strings.Contains(a, b) {
		shorter := len([]rune(a))
		longer := len([]rune(b))
		if shorter > longer {
			shorter, longer = longer, shorter
		}
		return 85 + 15*float64(shorter)/float64(longer)
	}

	ar := []rune(a)
	br := []rune(b)
	distance := levenshtein(ar, br)
	maxLen := len(ar)
	if len(br) > maxLen {
		maxLen = len(br)
	}
	return 100 * (1 - float64(distance)/float64(maxLen))
}

func levenshtein(a, b []rune) int {
	if len(a) == 0 {
		return len(b)
	}
	if len(b) == 0 {
		return len(a)
	}

	previous := make([]int, len(b)+1)
	current := make([]int, len(b)+1)
	for j := range previous {
		previous[j] = j
	}

	for i, ra := range a {
		current[0] = i + 1
		for j, rb := range b {
			cost := 0
			if ra != rb {
				cost = 1
			}
			current[j+1] = min3(
				current[j]+1,
				previous[j+1]+1,
				previous[j]+cost,
			)
		}
		previous, current = current, previous
	}
	return previous[len(b)]
}

func min3(a, b, c int) int {
	if a < b {
		if a < c {
			return a
		}
		return c
	}
	if b < c {
		return b
	}
	return c
}

func valueOrEmpty(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}
