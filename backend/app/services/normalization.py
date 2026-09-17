import re
import unicodedata

_CASK_SEPARATORS_RE = re.compile(r"[\s\-_/]+")
_NON_CASK_RE = re.compile(r"[^0-9a-z.]", re.IGNORECASE)


def normalize_text(value: str) -> str:
    value = unicodedata.normalize("NFKC", value)
    return " ".join(value.casefold().split())


def normalize_cask_no(value: str) -> str:
    value = unicodedata.normalize("NFKC", value).casefold().strip()
    value = _CASK_SEPARATORS_RE.sub(".", value)
    value = _NON_CASK_RE.sub("", value)
    value = re.sub(r"\.{2,}", ".", value)
    return value.strip(".")
