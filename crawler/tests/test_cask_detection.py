import pytest

from app.services.cask_detection import (
    extract_cask_candidates,
)


@pytest.mark.parametrize(
    ("texts", "expected"),
    [
        (
            ["SMWS", "93.228", "58.1%"],
            ["93.228", "58.1"],
        ),
        (
            ["93-228"],
            ["93.228"],
        ),
        (
            ["93:228"],
            ["93.228"],
        ),
        (
            ["93 228"],
            ["93.228"],
        ),
        (
            ["G15.30"],
            ["g15.30"],
        ),
        (
            ["nothing useful"],
            [],
        ),
    ],
)
def test_extract_cask_candidates(
    texts: list[str],
    expected: list[str],
) -> None:
    assert extract_cask_candidates(texts) == expected
