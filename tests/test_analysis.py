import pandas as pd

from seo_gsc_mcp.analysis import page_opportunities, summarize_site, top_queries


def sample_df() -> pd.DataFrame:
    return pd.DataFrame(
        [
            {"query": "seo audit", "page": "/a", "clicks": 10, "impressions": 100, "ctr": 0.1, "position": 8.0},
            {"query": "seo checker", "page": "/a", "clicks": 5, "impressions": 200, "ctr": 0.025, "position": 11.0},
            {"query": "gsc report", "page": "/b", "clicks": 30, "impressions": 300, "ctr": 0.1, "position": 3.0},
        ]
    )


def test_summarize_site():
    summary = summarize_site(sample_df())
    assert summary.rows == 3
    assert summary.total_clicks == 45
    assert summary.total_impressions == 600
    assert round(summary.weighted_ctr, 4) == 0.075


def test_top_queries():
    result = top_queries(sample_df(), limit=2)
    assert len(result) == 2
    assert result[0]["query"] == "gsc report"


def test_page_opportunities_filters_positions():
    result = page_opportunities(sample_df(), min_impressions=50, min_position=5, max_position=20, limit=10)
    assert len(result) == 1
    assert result[0]["page"] == "/a"
