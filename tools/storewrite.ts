declare const Bun: any;

import { tool } from "@opencode-ai/plugin";
import fs from "fs/promises";
import path from "path";

// Use Bun APIs when available for performance, but fall back to fs/promises
const writeFile =
  typeof Bun !== "undefined" && Bun?.write
    ? (p: string, data: string) => Bun.write(Bun.file(p), data)
    : (p: string, data: string) => fs.writeFile(p, data, "utf-8");

type StoreItem = {
  id: string;
  summary: string;
  tags: string[];
  status?: "active" | "archived" | "deprecated";
  links?: string[];
  data?: any;
  updatedAt?: string;
  createdAt?: string;
};

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default tool({
  description:
    "Save durable, session-scoped memories that survive session compaction. Use to persist architectural decisions, data schemas, design rationale, critical context, and any information that must reliably survive between agent restarts and memory pruning.",
  args: {
    id: tool.schema
      .string()
      .optional()
      .describe(
        "Optional UUID for updating existing records. Omit to create new record with auto-generated UUID.",
      ),
    summary: tool.schema
      .string()
      .min(1)
      .describe("Required: Concise description of what is being stored"),
    tags: tool.schema
      .array(tool.schema.string())
      .min(1)
      .describe(
        "Required: Array of tags for discoverability (e.g., ['auth', 'critical', 'design'])",
      ),
    status: tool.schema
      .enum(["active", "archived", "deprecated"])
      .optional()
      .default("active")
      .describe("Optional: Status of the stored item. Defaults to 'active'."),
    links: tool.schema
      .array(tool.schema.string())
      .optional()
      .describe("Optional: Array of related references or URLs"),
    data: tool.schema
      .any()
      .optional()
      .describe(
        "Optional: Structured payload containing the actual data to persist",
      ),
  },
  async execute(args, context) {
    const id = args.id ?? uuid();
    const dir = path.join(process.cwd(), ".opencode", "sessions");
    const file = path.join(dir, "store.json");

    await fs.mkdir(dir, { recursive: true });

    let items: StoreItem[] = [];

    try {
      const raw = await fs.readFile(file, "utf-8");
      try {
        const parsedFile = JSON.parse(raw);
        if (Array.isArray(parsedFile)) items = parsedFile;
      } catch (err) {
        // Gracefully handle JSON parse errors by backing up the file and resetting
        const backup = file + ".bak";
        await fs.writeFile(backup, raw, "utf-8");
        items = [];
      }
    } catch (err) {
      // file doesn't exist -> start fresh
      items = [];
    }

    const now = new Date().toISOString();

    const existingIndex = items.findIndex((it) => it.id === id);

    const base: StoreItem = {
      id,
      summary: args.summary,
      tags: args.tags,
      status: args.status ?? "active",
      links: args.links,
      data: args.data,
      updatedAt: now,
    };

    if (existingIndex >= 0) {
      const existing = items[existingIndex];
      const merged = {
        ...existing,
        ...base,
        createdAt: existing.createdAt ?? now,
      };
      items[existingIndex] = merged;
    } else {
      const item = { ...base, createdAt: now };
      items.push(item);
    }

    await writeFile(file, JSON.stringify(items, null, 2));

    return JSON.stringify({ success: true, id }, null, 2);
  },
});
