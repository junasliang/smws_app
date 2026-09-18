package normalize

import (
	"strings"
	"unicode"

	"golang.org/x/text/cases"
	"golang.org/x/text/unicode/norm"
)

var fold = cases.Fold()

// Text mirrors Python's:
// unicodedata.normalize("NFKC", value).casefold(), then collapses whitespace.
func Text(value string) string {
	value = norm.NFKC.String(value)
	value = fold.String(value)
	return strings.Join(strings.Fields(value), " ")
}

// CaskNo mirrors the current crawler normalization:
// NFKC + casefold + trim, whitespace/-/_// -> '.', remove everything except
// ASCII [0-9a-z.], collapse repeated dots, trim edge dots.
func CaskNo(value string) string {
	value = norm.NFKC.String(value)
	value = fold.String(value)
	value = strings.TrimSpace(value)

	var b strings.Builder
	lastDot := false

	for _, r := range value {
		isSeparator := unicode.IsSpace(r) || r == '-' || r == '_' || r == '/'
		if isSeparator || r == '.' {
			if b.Len() > 0 && !lastDot {
				b.WriteByte('.')
				lastDot = true
			}
			continue
		}

		if (r >= '0' && r <= '9') || (r >= 'a' && r <= 'z') {
			b.WriteRune(r)
			lastDot = false
		}
	}

	return strings.Trim(b.String(), ".")
}
