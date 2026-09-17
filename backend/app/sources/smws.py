import asyncio
import hashlib
import json
import re
from datetime import datetime
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup, Tag

from app.core.config import Settings
from app.schemas.source import ScrapedWhisky

_DETAIL_RE = re.compile(r"/product/detail/([A-Za-z0-9]+)")
_PRICE_RE = re.compile(r"(?:Now:\s*)?\$\s*([0-9,]+)", re.IGNORECASE)
_AGE_RE = re.compile(r"(\d+)")
_ABV_RE = re.compile(r"([0-9]+(?:\.[0-9]+)?)\s*%")

_LABELS: dict[str, tuple[str, ...]] = {
    "flavor_profile": ("風味特點",),
    "name_zh": ("酒款名稱",),
    "cask_no": ("橡木桶編號",),
    "abv": ("酒精濃度",),
    "age_text": ("年份",),
    "distillation_date": ("蒸餾日期",),
    "initial_cask": ("陳年橡木桶", "橡木桶類型"),
    "finishing_cask": ("熟成橡木桶",),
    "series": ("酒款系列",),
    "region": ("威士忌產區",),
}


class SmwsParseError(ValueError):
    pass


class SmwsClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._client = httpx.AsyncClient(
            base_url=settings.smws_base_url,
            timeout=settings.smws_timeout_seconds,
            follow_redirects=True,
            headers={
                "User-Agent": (
                    "smws-api/0.1 (+personal whisky catalogue; "
                    "polite low-frequency crawler)"
                )
            },
        )

    async def __aenter__(self) -> "SmwsClient":
        return self

    async def __aexit__(self, *args: object) -> None:
        await self._client.aclose()

    async def list_detail_urls(self) -> list[str]:
        urls: list[str] = []
        seen: set[str] = set()
        offset = 0
        page_size = self.settings.smws_page_size

        while True:
            response = await self._client.get(
                self.settings.smws_list_path,
                params={"max": page_size, "offset": offset},
            )
            response.raise_for_status()
            page_urls = self.parse_detail_urls(response.text)
            new_urls = [url for url in page_urls if url not in seen]

            if not new_urls:
                break

            urls.extend(new_urls)
            seen.update(new_urls)

            if len(page_urls) < page_size:
                break

            offset += page_size
            await asyncio.sleep(self.settings.smws_request_delay_seconds)

        return urls

    async def fetch_detail(self, url: str) -> ScrapedWhisky:
        response = await self._client.get(url)
        response.raise_for_status()
        return self.parse_detail(response.text, str(response.url))

    @staticmethod
    def parse_detail_urls(html: str) -> list[str]:
        soup = BeautifulSoup(html, "html.parser")
        urls: list[str] = []
        seen: set[str] = set()

        for anchor in soup.find_all("a", href=True):
            href = str(anchor.get("href"))
            if not _DETAIL_RE.search(href):
                continue
            absolute = urljoin("https://www.smws.com.tw", href)
            if absolute not in seen:
                urls.append(absolute)
                seen.add(absolute)

        return urls

    @classmethod
    def parse_detail(cls, html: str, source_url: str) -> ScrapedWhisky:
        soup = BeautifulSoup(html, "html.parser")
        heading = soup.find("h1")
        if heading is None:
            raise SmwsParseError("detail page does not contain an h1")

        heading_text = cls._clean(heading.get_text(" ", strip=True))
        fields = {
            key: cls._extract_labeled_value(soup, aliases)
            for key, aliases in _LABELS.items()
        }

        cask_no = fields["cask_no"] or cls._cask_from_heading(heading_text)
        if not cask_no:
            raise SmwsParseError("could not parse cask number")

        name_en = cls._english_name_from_heading(heading_text, cask_no)
        source_product_id = cls._product_id(source_url)

        age_text = fields["age_text"]
        age_match = _AGE_RE.search(age_text or "")
        age_years = int(age_match.group(1)) if age_match else None

        abv_match = _ABV_RE.search(fields["abv"] or "")
        abv = float(abv_match.group(1)) if abv_match else None

        distillation_date = None
        if fields["distillation_date"]:
            try:
                distillation_date = datetime.strptime(
                    fields["distillation_date"], "%d/%m/%Y"
                ).date()
            except ValueError:
                distillation_date = None

        text = cls._clean(soup.get_text("\n", strip=True))
        price_twd = cls._extract_price(text)
        is_available = cls._extract_availability(text)
        tasting_notes = cls._extract_tasting_notes(soup)

        content_for_hash = {
            "cask_no": cask_no,
            "name_en": name_en,
            "name_zh": fields["name_zh"],
            "flavor_profile": fields["flavor_profile"],
            "abv": abv,
            "age_text": age_text,
            "distillation_date": (
                distillation_date.isoformat() if distillation_date else None
            ),
            "initial_cask": fields["initial_cask"],
            "finishing_cask": fields["finishing_cask"],
            "series": fields["series"],
            "region": fields["region"],
            "price_twd": price_twd,
            "is_available": is_available,
            "tasting_notes": tasting_notes,
        }
        content_hash = hashlib.sha256(
            json.dumps(
                content_for_hash,
                ensure_ascii=False,
                sort_keys=True,
            ).encode("utf-8")
        ).hexdigest()

        return ScrapedWhisky(
            source_product_id=source_product_id,
            source_url=source_url,
            cask_no=cask_no,
            name_en=name_en,
            name_zh=fields["name_zh"],
            flavor_profile=fields["flavor_profile"],
            abv=abv,
            age_text=age_text,
            age_years=age_years,
            distillation_date=distillation_date,
            initial_cask=fields["initial_cask"],
            finishing_cask=fields["finishing_cask"],
            series=fields["series"],
            region=fields["region"],
            price_twd=price_twd,
            is_available=is_available,
            tasting_notes=tasting_notes,
            content_hash=content_hash,
        )

    @classmethod
    def _extract_labeled_value(
        cls,
        soup: BeautifulSoup,
        aliases: tuple[str, ...],
    ) -> str | None:
        # Prefer compact semantic containers first.
        for tag_name in ("li", "p", "dt", "dd", "div", "span"):
            for node in soup.find_all(tag_name):
                if not isinstance(node, Tag):
                    continue
                text = cls._clean(node.get_text(" ", strip=True))
                for label in aliases:
                    if text == label:
                        sibling = node.find_next_sibling()
                        if sibling is not None:
                            value = cls._clean(sibling.get_text(" ", strip=True))
                            if value:
                                return value
                    if text.startswith(label):
                        value = cls._clean(text[len(label) :])
                        if value:
                            return value

        # Fallback for markup where label and value are separate text nodes.
        strings = [cls._clean(s) for s in soup.stripped_strings]
        for idx, text in enumerate(strings[:-1]):
            if text in aliases:
                value = strings[idx + 1]
                if value and value not in aliases:
                    return value
        return None

    @staticmethod
    def _extract_price(text: str) -> int | None:
        match = _PRICE_RE.search(text)
        if not match:
            return None
        return int(match.group(1).replace(",", ""))

    @staticmethod
    def _extract_availability(text: str) -> bool | None:
        # Test unavailable first because it contains "available" as a suffix.
        if re.search(r"\bUnavailable\b", text, re.IGNORECASE):
            return False
        if re.search(r"\bAvailable\b", text, re.IGNORECASE):
            return True
        return None

    @classmethod
    def _extract_tasting_notes(cls, soup: BeautifulSoup) -> str | None:
        lines = [cls._clean(s) for s in soup.stripped_strings]
        start_indexes = [i for i, value in enumerate(lines) if value == "品飲筆記"]
        if not start_indexes:
            return None

        start = start_indexes[-1] + 1
        end = len(lines)
        stop_prefixes = (
            "如若商品及價格等資訊有異動",
            "依法律規定網路不得販售酒類",
            "提醒您未成年請勿飲酒",
            "READ FURTHER NOTES",
        )
        for idx in range(start, len(lines)):
            if lines[idx].startswith(stop_prefixes):
                end = idx
                break

        notes = "\n".join(lines[start:end]).strip()
        return notes or None

    @staticmethod
    def _cask_from_heading(heading: str) -> str | None:
        parts = heading.split(maxsplit=1)
        return parts[0] if parts else None

    @staticmethod
    def _english_name_from_heading(heading: str, cask_no: str) -> str | None:
        if heading.startswith(cask_no):
            value = heading[len(cask_no) :].strip()
            return value or None
        return heading or None

    @staticmethod
    def _product_id(source_url: str) -> str:
        path = urlparse(source_url).path.rstrip("/")
        product_id = path.rsplit("/", 1)[-1]
        if not product_id:
            raise SmwsParseError("could not parse source product id")
        return product_id

    @staticmethod
    def _clean(value: str) -> str:
        return re.sub(r"[ \t\r\f\v]+", " ", value).strip()
