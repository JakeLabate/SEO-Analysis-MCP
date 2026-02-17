from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import pandas as pd

REQUIRED_COLUMNS = {"query", "page", "clicks", "impressions", "ctr", "position"}


@dataclass(frozen=True)
class AnalysisSummary:
    rows: int
    total_clicks: float
    total_impressions: float
    weighted_ctr: float
    weighted_position: float


def load_gsc_data(path: str) -> pd.DataFrame:
    """Load GSC data from CSV or JSON and normalize column names."""
    if path.endswith(".csv"):
        df = pd.read_csv(path)
    elif path.endswith(".json"):
        df = pd.read_json(path)
    else:
        raise ValueError("Unsupported file format. Use CSV or JSON.")

    df.columns = [c.strip().lower() for c in df.columns]
    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        raise ValueError(f"Missing required columns: {sorted(missing)}")

    numeric_cols = ["clicks", "impressions", "ctr", "position"]
    for col in numeric_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)

    df["query"] = df["query"].fillna("").astype(str)
    df["page"] = df["page"].fillna("").astype(str)
    return df


def summarize_site(df: pd.DataFrame) -> AnalysisSummary:
    if df.empty:
        return AnalysisSummary(0, 0.0, 0.0, 0.0, 0.0)

    total_clicks = float(df["clicks"].sum())
    total_impressions = float(df["impressions"].sum())
    weighted_ctr = (total_clicks / total_impressions) if total_impressions else 0.0
    weighted_position = (
        float((df["position"] * df["impressions"]).sum()) / total_impressions
        if total_impressions
        else 0.0
    )
    return AnalysisSummary(
        rows=int(len(df)),
        total_clicks=total_clicks,
        total_impressions=total_impressions,
        weighted_ctr=weighted_ctr,
        weighted_position=weighted_position,
    )


def top_queries(df: pd.DataFrame, limit: int = 10, min_impressions: int = 0) -> list[dict[str, Any]]:
    query_df = (
        df[df["impressions"] >= min_impressions]
        .groupby("query", as_index=False)
        .agg(clicks=("clicks", "sum"), impressions=("impressions", "sum"))
    )
    query_df["ctr"] = query_df["clicks"] / query_df["impressions"].replace(0, pd.NA)
    query_df["ctr"] = query_df["ctr"].fillna(0.0)
    ranked = query_df.sort_values(["clicks", "impressions"], ascending=False).head(limit)
    return ranked.to_dict(orient="records")


def page_opportunities(
    df: pd.DataFrame,
    min_impressions: int = 100,
    min_position: float = 5.0,
    max_position: float = 20.0,
    limit: int = 20,
) -> list[dict[str, Any]]:
    """Find pages with meaningful impressions but middling rankings."""
    page_df = df.groupby("page", as_index=False).agg(
        clicks=("clicks", "sum"),
        impressions=("impressions", "sum"),
        avg_position=("position", "mean"),
    )
    filt = page_df[
        (page_df["impressions"] >= min_impressions)
        & (page_df["avg_position"] >= min_position)
        & (page_df["avg_position"] <= max_position)
    ].copy()
    filt["ctr"] = filt["clicks"] / filt["impressions"].replace(0, pd.NA)
    filt["ctr"] = filt["ctr"].fillna(0.0)
    ranked = filt.sort_values(["impressions", "avg_position"], ascending=[False, True]).head(limit)
    return ranked.to_dict(orient="records")
