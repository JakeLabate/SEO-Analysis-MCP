from __future__ import annotations

from pathlib import Path
from typing import Any

from mcp.server.fastmcp import FastMCP

from seo_gsc_mcp.analysis import load_gsc_data, page_opportunities, summarize_site, top_queries

mcp = FastMCP("seo-gsc-analysis")


def _resolve_path(path: str) -> str:
    p = Path(path).expanduser().resolve()
    if not p.exists():
        raise FileNotFoundError(f"Path does not exist: {p}")
    return str(p)


@mcp.tool()
def gsc_summary(path: str) -> dict[str, Any]:
    """Return site-level SEO metrics from a GSC export file (CSV/JSON)."""
    df = load_gsc_data(_resolve_path(path))
    summary = summarize_site(df)
    return {
        "rows": summary.rows,
        "total_clicks": summary.total_clicks,
        "total_impressions": summary.total_impressions,
        "weighted_ctr": summary.weighted_ctr,
        "weighted_position": summary.weighted_position,
    }


@mcp.tool()
def gsc_top_queries(path: str, limit: int = 10, min_impressions: int = 0) -> list[dict[str, Any]]:
    """Return top query opportunities from a GSC export file."""
    df = load_gsc_data(_resolve_path(path))
    return top_queries(df, limit=limit, min_impressions=min_impressions)


@mcp.tool()
def gsc_page_opportunities(
    path: str,
    min_impressions: int = 100,
    min_position: float = 5.0,
    max_position: float = 20.0,
    limit: int = 20,
) -> list[dict[str, Any]]:
    """Find pages with traffic potential from GSC export data."""
    df = load_gsc_data(_resolve_path(path))
    return page_opportunities(
        df,
        min_impressions=min_impressions,
        min_position=min_position,
        max_position=max_position,
        limit=limit,
    )


def main() -> None:
    mcp.run()


if __name__ == "__main__":
    main()
