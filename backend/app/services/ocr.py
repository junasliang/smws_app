from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from io import BytesIO
from threading import Lock

import numpy as np
from paddleocr import PaddleOCR
from PIL import Image, ImageOps, UnidentifiedImageError

from app.core.config import get_settings


@dataclass(frozen=True)
class OcrResult:
    texts: list[str]
    scores: list[float]


class OcrService:
    def __init__(
        self,
        *,
        device: str,
        max_image_side: int,
        min_score: float,
    ) -> None:
        self.max_image_side = max_image_side
        self.min_score = min_score

        self._lock = Lock()

        self._ocr = PaddleOCR(
            text_detection_model_name="PP-OCRv5_mobile_det",
            text_recognition_model_name="PP-OCRv5_mobile_rec",
            use_doc_orientation_classify=False,
            use_doc_unwarping=False,
            use_textline_orientation=False,
            device=device,
        )

    def recognize(self, image_bytes: bytes) -> OcrResult:
        image = self._decode_image(image_bytes)

        # Paddle/OpenCV commonly use BGR ndarray.
        rgb = np.asarray(image)
        bgr = rgb[:, :, ::-1].copy()

        texts: list[str] = []
        scores: list[float] = []

        # PaddleOCR pipeline is shared by requests.
        # Serialize inference for the MVP.
        with self._lock:
            results = self._ocr.predict(bgr)

            for result in results:
                payload = result.json
                data = payload.get("res", payload)

                rec_texts = data.get("rec_texts", [])
                rec_scores = data.get("rec_scores", [])

                for text, score in zip(
                    rec_texts,
                    rec_scores,
                    strict=False,
                ):
                    text = str(text).strip()
                    score = float(score)

                    if not text:
                        continue

                    if score < self.min_score:
                        continue

                    texts.append(text)
                    scores.append(score)

        return OcrResult(
            texts=texts,
            scores=scores,
        )

    def _decode_image(self, image_bytes: bytes) -> Image.Image:
        try:
            image = Image.open(BytesIO(image_bytes))

            # Correct iPhone EXIF orientation if necessary.
            image = ImageOps.exif_transpose(image)

            image = image.convert("RGB")

        except UnidentifiedImageError as exc:
            raise ValueError("Invalid image") from exc

        width, height = image.size

        if max(width, height) > self.max_image_side:
            image.thumbnail(
                (
                    self.max_image_side,
                    self.max_image_side,
                )
            )

        return image


@lru_cache(maxsize=1)
def get_ocr_service() -> OcrService:
    settings = get_settings()

    return OcrService(
        device=settings.ocr_device,
        max_image_side=settings.ocr_max_image_side,
        min_score=settings.ocr_min_score,
    )
