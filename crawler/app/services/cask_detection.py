from __future__ import annotations

import re

from app.services.normalization import normalize_cask_no

# Highest-confidence pattern.
#
# OCR examples:
#
# SOCIETY CASK NO: 53.515
# SOCIETY CASK N0: 53.515
# CASK NO. 93.228
# CASK N0 53.515
#
# OCR often confuses:
# O -> 0
# . -> :
_CASK_CONTEXT_PATTERN = re.compile(
    r"""
    \b
    CASK
    \s*
    N[O0]          # NO / N0
    \s*
    [.:#-]?
    \s*
    (
        [A-Z]{0,2}\d{1,3}
        \s*
        [.\-:]
        \s*
        \d{1,4}
    )
    """,
    re.IGNORECASE | re.VERBOSE,
)


# Lower-confidence generic SMWS number.
#
# 53.515
# 93-228
# G15:30
#
# Do NOT accept whitespace as a separator here.
# Otherwise values such as dates or unrelated numbers
# become too easy to mis-detect.
_GENERIC_CASK_PATTERN = re.compile(
    r"""
    (?<![A-Z0-9])
    (
        [A-Z]{0,2}\d{1,3}
        \s*
        [.\-:]
        \s*
        \d{1,4}
    )
    (?!\d)
    """,
    re.IGNORECASE | re.VERBOSE,
)


def extract_cask_candidates(
    texts: list[str],
) -> list[str]:
    """
    Extract possible SMWS cask numbers from OCR output.

    Priority:
    1. Explicit "CASK NO / CASK N0" context.
    2. Generic number patterns such as 53.515.

    Results are normalized and deduplicated.
    """

    high_confidence: list[str] = []
    fallback: list[str] = []

    for text in texts:
        high_confidence.extend(_extract_context_candidates(text))

    # If OCR split one semantic line into multiple pieces,
    # also try the combined text.
    combined = " ".join(texts)

    high_confidence.extend(_extract_context_candidates(combined))

    # If we found an explicit CASK NO value,
    # put it first but still retain generic candidates
    # as fallback/debug information.
    for text in texts:
        fallback.extend(_extract_generic_candidates(text))

    fallback.extend(_extract_generic_candidates(combined))

    candidates = high_confidence + fallback

    return _normalize_and_dedupe(candidates)


def _extract_context_candidates(
    text: str,
) -> list[str]:
    return [match.group(1) for match in _CASK_CONTEXT_PATTERN.finditer(text)]


def _extract_generic_candidates(
    text: str,
) -> list[str]:
    return [match.group(1) for match in _GENERIC_CASK_PATTERN.finditer(text)]


def _normalize_and_dedupe(
    candidates: list[str],
) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []

    for candidate in candidates:
        normalized = _normalize_candidate(candidate)

        if not normalized:
            continue

        if normalized in seen:
            continue

        seen.add(normalized)
        result.append(normalized)

    return result


def _normalize_candidate(
    candidate: str,
) -> str:
    """
    Normalize OCR variants:

    53-515 -> 53.515
    53:515 -> 53.515
    53. 515 -> 53.515
    """

    cleaned = candidate.strip().upper()

    cleaned = re.sub(
        r"\s*[-:]\s*",
        ".",
        cleaned,
    )

    cleaned = re.sub(
        r"\s*\.\s*",
        ".",
        cleaned,
    )

    return normalize_cask_no(cleaned)
