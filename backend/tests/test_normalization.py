from app.services.normalization import normalize_cask_no


def test_normalize_cask_no() -> None:
    assert normalize_cask_no("93.228") == "93.228"
    assert normalize_cask_no("93 228") == "93.228"
    assert normalize_cask_no("93-228") == "93.228"
