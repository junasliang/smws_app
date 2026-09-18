package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"path/filepath"
	"strings"

	"smws-api/internal/model"
	"smws-api/internal/normalize"

	_ "modernc.org/sqlite"
)

var ErrNotFound = errors.New("whisky not found")

type WhiskyRepository struct {
	db *sql.DB
}

func OpenReadOnly(ctx context.Context, dbPath string) (*sql.DB, error) {
	absPath, err := filepath.Abs(dbPath)
	if err != nil {
		return nil, fmt.Errorf("resolve database path: %w", err)
	}

	// mode=ro prevents accidental writes from the production API.
	dsn := "file:" + filepath.ToSlash(absPath) + "?mode=ro"
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}

	// The catalogue is small. Bound the pool so Cloud Run concurrency cannot
	// create an unbounded number of SQLite connections.
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)

	if err := db.PingContext(ctx); err != nil {
		db.Close()
		return nil, fmt.Errorf("ping sqlite %s: %w", absPath, err)
	}

	return db, nil
}

func NewWhiskyRepository(db *sql.DB) *WhiskyRepository {
	return &WhiskyRepository{db: db}
}

const whiskyColumns = `
	cask_no,
	cask_no_normalized,
	name_en,
	name_zh,
	flavor_profile,
	abv,
	age_text,
	age_years,
	CAST(distillation_date AS TEXT),
	initial_cask,
	finishing_cask,
	series,
	region,
	price_twd,
	CAST(is_available AS INTEGER),
	tasting_notes,
	source_url
`

func (r *WhiskyRepository) GetByCaskNo(ctx context.Context, caskNo string) (*model.Whisky, error) {
	normalized := normalize.CaskNo(caskNo)
	if normalized == "" {
		return nil, ErrNotFound
	}

	query := `SELECT ` + whiskyColumns + ` FROM whiskies WHERE cask_no_normalized = ? LIMIT 1`
	row := r.db.QueryRowContext(ctx, query, normalized)

	whisky, err := scanWhisky(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &whisky, nil
}

func (r *WhiskyRepository) SearchCandidates(ctx context.Context, queryText string, limit int) ([]model.Whisky, error) {
	like := "%" + strings.TrimSpace(queryText) + "%"
	normalized := normalize.CaskNo(queryText)

	query := `SELECT ` + whiskyColumns + `
		FROM whiskies
		WHERE LOWER(cask_no) LIKE LOWER(?)
		   OR LOWER(COALESCE(name_en, '')) LIKE LOWER(?)
		   OR LOWER(COALESCE(name_zh, '')) LIKE LOWER(?)`
	args := []any{like, like, like}

	if normalized != "" {
		query += ` OR cask_no_normalized LIKE ?`
		args = append(args, "%"+normalized+"%")
	}

	query += ` LIMIT ?`
	args = append(args, limit)

	return r.queryMany(ctx, query, args...)
}

func (r *WhiskyRepository) ListAll(ctx context.Context, limit int) ([]model.Whisky, error) {
	query := `SELECT ` + whiskyColumns + ` FROM whiskies LIMIT ?`
	return r.queryMany(ctx, query, limit)
}

func (r *WhiskyRepository) queryMany(ctx context.Context, query string, args ...any) ([]model.Whisky, error) {
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("query whiskies: %w", err)
	}
	defer rows.Close()

	items := make([]model.Whisky, 0)
	for rows.Next() {
		item, err := scanWhisky(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate whiskies: %w", err)
	}
	return items, nil
}

type scanner interface {
	Scan(dest ...any) error
}

func scanWhisky(s scanner) (model.Whisky, error) {
	var (
		caskNo           string
		caskNoNormalized string
		nameEn           sql.NullString
		nameZh           sql.NullString
		flavorProfile    sql.NullString
		abv              sql.NullFloat64
		ageText          sql.NullString
		ageYears         sql.NullInt64
		distillationDate sql.NullString
		initialCask      sql.NullString
		finishingCask    sql.NullString
		series           sql.NullString
		region           sql.NullString
		priceTWD         sql.NullInt64
		isAvailable      sql.NullInt64
		tastingNotes     sql.NullString
		sourceURL        string
	)

	if err := s.Scan(
		&caskNo,
		&caskNoNormalized,
		&nameEn,
		&nameZh,
		&flavorProfile,
		&abv,
		&ageText,
		&ageYears,
		&distillationDate,
		&initialCask,
		&finishingCask,
		&series,
		&region,
		&priceTWD,
		&isAvailable,
		&tastingNotes,
		&sourceURL,
	); err != nil {
		return model.Whisky{}, err
	}

	return model.Whisky{
		CaskNo:           caskNo,
		CaskNoNormalized: caskNoNormalized,
		NameEn:           stringPtr(nameEn),
		NameZh:           stringPtr(nameZh),
		FlavorProfile:    stringPtr(flavorProfile),
		ABV:              floatPtr(abv),
		AgeText:          stringPtr(ageText),
		AgeYears:         intPtr(ageYears),
		DistillationDate: stringPtr(distillationDate),
		InitialCask:      stringPtr(initialCask),
		FinishingCask:    stringPtr(finishingCask),
		Series:           stringPtr(series),
		Region:           stringPtr(region),
		PriceTWD:         intPtr(priceTWD),
		IsAvailable:      boolPtr(isAvailable),
		TastingNotes:     stringPtr(tastingNotes),
		SourceURL:        sourceURL,
	}, nil
}

func stringPtr(v sql.NullString) *string {
	if !v.Valid {
		return nil
	}
	value := v.String
	return &value
}

func floatPtr(v sql.NullFloat64) *float64 {
	if !v.Valid {
		return nil
	}
	value := v.Float64
	return &value
}

func intPtr(v sql.NullInt64) *int {
	if !v.Valid {
		return nil
	}
	value := int(v.Int64)
	return &value
}

func boolPtr(v sql.NullInt64) *bool {
	if !v.Valid {
		return nil
	}
	value := v.Int64 != 0
	return &value
}
