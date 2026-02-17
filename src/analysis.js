import fs from "node:fs";

const REQUIRED_COLUMNS = new Set(["query", "page", "clicks", "impressions", "ctr", "position"]);

function parseCsv(content) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return [];
  }

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? "";
    });
    return row;
  });
}

function normalizeRows(rows) {
  const columns = new Set(Object.keys(rows[0] ?? {}).map((c) => c.trim().toLowerCase()));
  const missing = [...REQUIRED_COLUMNS].filter((col) => !columns.has(col));
  if (missing.length > 0) {
    throw new Error(`Missing required columns: ${JSON.stringify(missing.sort())}`);
  }

  return rows.map((row) => {
    const normalized = {};
    Object.entries(row).forEach(([key, value]) => {
      normalized[key.trim().toLowerCase()] = value;
    });

    return {
      query: String(normalized.query ?? ""),
      page: String(normalized.page ?? ""),
      clicks: Number(normalized.clicks) || 0,
      impressions: Number(normalized.impressions) || 0,
      ctr: Number(normalized.ctr) || 0,
      position: Number(normalized.position) || 0,
    };
  });
}

export function loadGscData(path) {
  let rows;
  if (path.endsWith(".csv")) {
    rows = parseCsv(fs.readFileSync(path, "utf8"));
  } else if (path.endsWith(".json")) {
    const json = JSON.parse(fs.readFileSync(path, "utf8"));
    rows = Array.isArray(json) ? json : [];
  } else {
    throw new Error("Unsupported file format. Use CSV or JSON.");
  }

  if (rows.length === 0) {
    return [];
  }

  return normalizeRows(rows);
}

export function summarizeSite(rows) {
  if (rows.length === 0) {
    return {
      rows: 0,
      total_clicks: 0,
      total_impressions: 0,
      weighted_ctr: 0,
      weighted_position: 0,
    };
  }

  const total_clicks = rows.reduce((acc, row) => acc + row.clicks, 0);
  const total_impressions = rows.reduce((acc, row) => acc + row.impressions, 0);
  const weighted_ctr = total_impressions ? total_clicks / total_impressions : 0;
  const weighted_position = total_impressions
    ? rows.reduce((acc, row) => acc + row.position * row.impressions, 0) / total_impressions
    : 0;

  return {
    rows: rows.length,
    total_clicks,
    total_impressions,
    weighted_ctr,
    weighted_position,
  };
}

export function topQueries(rows, limit = 10, min_impressions = 0) {
  const groups = new Map();

  for (const row of rows) {
    if (row.impressions < min_impressions) {
      continue;
    }

    const existing = groups.get(row.query) ?? { query: row.query, clicks: 0, impressions: 0 };
    existing.clicks += row.clicks;
    existing.impressions += row.impressions;
    groups.set(row.query, existing);
  }

  return [...groups.values()]
    .map((item) => ({
      ...item,
      ctr: item.impressions ? item.clicks / item.impressions : 0,
    }))
    .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
    .slice(0, limit);
}

export function pageOpportunities(
  rows,
  min_impressions = 100,
  min_position = 5,
  max_position = 20,
  limit = 20,
) {
  const groups = new Map();

  for (const row of rows) {
    const existing = groups.get(row.page) ?? {
      page: row.page,
      clicks: 0,
      impressions: 0,
      positions: [],
    };
    existing.clicks += row.clicks;
    existing.impressions += row.impressions;
    existing.positions.push(row.position);
    groups.set(row.page, existing);
  }

  return [...groups.values()]
    .map((item) => ({
      page: item.page,
      clicks: item.clicks,
      impressions: item.impressions,
      avg_position: item.positions.reduce((a, b) => a + b, 0) / item.positions.length,
      ctr: item.impressions ? item.clicks / item.impressions : 0,
    }))
    .filter(
      (item) =>
        item.impressions >= min_impressions &&
        item.avg_position >= min_position &&
        item.avg_position <= max_position,
    )
    .sort((a, b) => b.impressions - a.impressions || a.avg_position - b.avg_position)
    .slice(0, limit);
}
