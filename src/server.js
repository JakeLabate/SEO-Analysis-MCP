import fs from "node:fs";
import path from "node:path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { loadGscData, pageOpportunities, summarizeSite, topQueries } from "./analysis.js";

const server = new Server(
  {
    name: "seo-gsc-analysis",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

function resolvePath(inputPath) {
  const resolved = path.resolve(inputPath.replace(/^~(?=$|\/)/, process.env.HOME || "~"));
  if (!fs.existsSync(resolved)) {
    throw new Error(`Path does not exist: ${resolved}`);
  }
  return resolved;
}

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "gsc_summary",
      description: "Return site-level SEO metrics from a GSC export file (CSV/JSON).",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string" },
        },
        required: ["path"],
      },
    },
    {
      name: "gsc_top_queries",
      description: "Return top query opportunities from a GSC export file.",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string" },
          limit: { type: "number", default: 10 },
          min_impressions: { type: "number", default: 0 },
        },
        required: ["path"],
      },
    },
    {
      name: "gsc_page_opportunities",
      description: "Find pages with traffic potential from GSC export data.",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string" },
          min_impressions: { type: "number", default: 100 },
          min_position: { type: "number", default: 5 },
          max_position: { type: "number", default: 20 },
          limit: { type: "number", default: 20 },
        },
        required: ["path"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const args = request.params.arguments ?? {};

  if (request.params.name === "gsc_summary") {
    const rows = loadGscData(resolvePath(args.path));
    return { content: [{ type: "text", text: JSON.stringify(summarizeSite(rows)) }] };
  }

  if (request.params.name === "gsc_top_queries") {
    const rows = loadGscData(resolvePath(args.path));
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(topQueries(rows, args.limit ?? 10, args.min_impressions ?? 0)),
        },
      ],
    };
  }

  if (request.params.name === "gsc_page_opportunities") {
    const rows = loadGscData(resolvePath(args.path));
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            pageOpportunities(
              rows,
              args.min_impressions ?? 100,
              args.min_position ?? 5,
              args.max_position ?? 20,
              args.limit ?? 20,
            ),
          ),
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${request.params.name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
