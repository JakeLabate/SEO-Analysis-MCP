import test from "node:test";
import assert from "node:assert/strict";
import { pageOpportunities, summarizeSite, topQueries } from "../src/analysis.js";

function sampleRows() {
  return [
    { query: "seo audit", page: "/a", clicks: 10, impressions: 100, ctr: 0.1, position: 8.0 },
    { query: "seo checker", page: "/a", clicks: 5, impressions: 200, ctr: 0.025, position: 11.0 },
    { query: "gsc report", page: "/b", clicks: 30, impressions: 300, ctr: 0.1, position: 3.0 },
  ];
}

test("summarizeSite", () => {
  const summary = summarizeSite(sampleRows());
  assert.equal(summary.rows, 3);
  assert.equal(summary.total_clicks, 45);
  assert.equal(summary.total_impressions, 600);
  assert.equal(Number(summary.weighted_ctr.toFixed(4)), 0.075);
});

test("topQueries", () => {
  const result = topQueries(sampleRows(), 2);
  assert.equal(result.length, 2);
  assert.equal(result[0].query, "gsc report");
});

test("pageOpportunities filters positions", () => {
  const result = pageOpportunities(sampleRows(), 50, 5, 20, 10);
  assert.equal(result.length, 1);
  assert.equal(result[0].page, "/a");
});
