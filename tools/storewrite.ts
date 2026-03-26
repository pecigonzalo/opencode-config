import { tool } from "@opencode-ai/plugin";
import {
  type StoreItem,
  readAllYamlItems,
  writeYamlItem,
} from "./store-types.js";

/** Generates a 12-character lowercase hex ID, git-short style. */
function generateId(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Picks a hex ID that does not collide with any existing YAML item. */
async function uniqueId(): Promise<string> {
  const existing = await readAllYamlItems();
  const existingIds = new Set(existing.map((it) => it.id));
  let id = generateId();
  while (existingIds.has(id)) {
    id = generateId();
  }
  return id;
}

export default tool({
  description:
    "Save durable, session-scoped memories that survive session compaction. " +
    "Use to persist architectural decisions, data schemas, design rationale, " +
    "critical context, and any information that must reliably survive between " +
    "agent restarts and memory pruning.",
  args: {
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
  async execute(args) {
    const id = await uniqueId();
    const now = new Date().toISOString();

    const item: StoreItem = {
      id,
      summary: args.summary,
      tags: args.tags,
      status: args.status ?? "active",
      links: args.links,
      data: args.data,
      createdAt: now,
      updatedAt: now,
    };

    await writeYamlItem(item);

    return JSON.stringify({ success: true, id }, null, 2);
  },
});
