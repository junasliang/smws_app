from app.sources.smws import SmwsClient

DETAIL_HTML = """
<html>
  <body>
    <h1>93.228 Squid ink pastaand sparkling limeade</h1>
    <div>Now: $3200</div>
    <div>Available</div>
    <ul>
      <li>風味特點 Sweet &amp; Zesty甜美與清爽</li>
      <li>酒款名稱 墨魚麵與萊姆蘇打水</li>
      <li>橡木桶編號 93.228</li>
      <li>酒精濃度 58.1%</li>
      <li>年份 10</li>
      <li>蒸餾日期 11/06/2015</li>
      <li>陳年橡木桶 1st fill Bourbon barrel</li>
      <li>酒款系列 Creator's Collection- The spirit of five</li>
      <li>威士忌產區 Campbeltown</li>
    </ul>
    <a>品飲筆記</a>
    <h3>品飲筆記</h3>
    <p>加水前：</p>
    <p>香氣- sample aroma</p>
    <p>口感- sample palate</p>
    <p>如若商品及價格等資訊有異動，均以實體門市之商品資訊為主。</p>
  </body>
</html>
"""

LIST_HTML = """
<html><body>
<a href="/product/detail/abc123">One</a>
<a href="/product/detail/def456">Two</a>
<a href="/product/detail/abc123">Duplicate</a>
</body></html>
"""


def test_parse_detail_urls() -> None:
    urls = SmwsClient.parse_detail_urls(LIST_HTML)
    assert urls == [
        "https://www.smws.com.tw/product/detail/abc123",
        "https://www.smws.com.tw/product/detail/def456",
    ]


def test_parse_detail() -> None:
    item = SmwsClient.parse_detail(
        DETAIL_HTML,
        "https://www.smws.com.tw/product/detail/abc123",
    )
    assert item.source_product_id == "abc123"
    assert item.cask_no == "93.228"
    assert item.name_en == "Squid ink pastaand sparkling limeade"
    assert item.name_zh == "墨魚麵與萊姆蘇打水"
    assert item.abv == 58.1
    assert item.age_years == 10
    assert item.price_twd == 3200
    assert item.is_available is True
    assert item.region == "Campbeltown"
    assert "sample aroma" in (item.tasting_notes or "")
