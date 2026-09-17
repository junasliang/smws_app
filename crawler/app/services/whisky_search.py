from rapidfuzz import fuzz

from app.models.whisky import Whisky
from app.repositories.whisky import WhiskyRepository
from app.services.normalization import normalize_cask_no, normalize_text


class WhiskySearchService:
    def __init__(self, repository: WhiskyRepository) -> None:
        self.repository = repository

    def get_by_cask_no(self, cask_no: str) -> Whisky | None:
        return self.repository.get_by_cask_no(cask_no)

    def search(self, query: str, limit: int = 20) -> list[Whisky]:
        query = query.strip()
        if not query:
            return []

        exact = self.repository.get_by_cask_no(query)
        if exact is not None:
            return [exact]

        candidates = self.repository.search_candidates(query, limit=100)
        if not candidates:
            # Only ~100 products today, so a fuzzy fallback over the local
            # catalogue is cheap and improves OCR/name typo tolerance.
            candidates = self.repository.list_all(limit=500)

        normalized_query = normalize_text(query)
        normalized_cask = normalize_cask_no(query)

        def score(item: Whisky) -> float:
            values = [
                normalize_text(item.name_en or ""),
                normalize_text(item.name_zh or ""),
                normalize_text(item.cask_no),
            ]
            fuzzy_score = max(
                fuzz.WRatio(normalized_query, value) for value in values if value
            )
            cask_bonus = (
                25
                if normalized_cask
                and normalized_cask == item.cask_no_normalized
                else 0
            )
            return fuzzy_score + cask_bonus

        ranked = sorted(candidates, key=score, reverse=True)
        return ranked[:limit]
