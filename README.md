# SEO Analysis MCP (Google Search Console)

This repository contains an MCP server that analyzes Google Search Console (GSC) exports (CSV or JSON) for SEO insights.

## Features

- `gsc_summary(path)`
  - Site-level totals: clicks, impressions, weighted CTR, weighted average position.
- `gsc_top_queries(path, limit=10, min_impressions=0)`
  - Top-performing queries by clicks/impressions with calculated CTR.
- `gsc_page_opportunities(path, min_impressions=100, min_position=5, max_position=20, limit=20)`
  - Pages with meaningful impressions and mid-range rankings (high opportunity for optimization).

## Input schema

Input files must include these columns:

- `query`
- `page`
- `clicks`
- `impressions`
- `ctr`
- `position`

## Quickstart

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
```

Run MCP server:

```bash
python -m seo_gsc_mcp.server
```

## Example MCP client config

```json
{
  "mcpServers": {
    "seo-gsc-analysis": {
      "command": "python",
      "args": ["-m", "seo_gsc_mcp.server"]
    }
  }
}
```

## Notes

- This version analyzes exported GSC data from local files.
- You can extend it with direct Google Search Console API ingestion (service account/OAuth) in a later iteration.
