import { tool } from "@opencode-ai/plugin";
import {
  type StoreItem,
  readAllYamlItems,
  readYamlItem,
  readLegacyJson,
} from "./store-types.js";

/**
 * Merge YAML items with legacy JSON items. YAML wins when the same ID
 * exists in both sources.
 */
function mergeItems(
  yamlItems: StoreItem[],
  legacyItems: StoreItem[],
): StoreItem[] {
  const yamlIds = new Set(yamlItems.map((it) => it.id));
  const legacyOnly = legacyItems.filter((it) => !yamlIds.has(it.id));
  return [...yamlItems, ...legacyOnly];
}

export default tool({
  description:
    "Query and retrieve structured session memories. Supports two modes: " +
    "LIST (discovery - returns summaries without heavy data) and READ " +
    "(retrieval - returns full item with data field). Always prefer LIST " +
    "mode first if unsure what IDs exist.",
  args: {
    id: tool.schema
      .string()
      .optional()
      .describe(
        "Optional: Specific item ID to retrieve (READ mode). Returns full item including data field. Omit for LIST mode.",
      ),
    tags: tool.schema
      .array(tool.schema.string())
      .optional()
      .describe(
        "Optional: Filter by tags in LIST mode (AND logic - must match ALL tags). Example: ['auth', 'critical']",
      ),
    includeArchived: tool.schema
      .boolean()
      .optional()
      .describe(
        "Optional: Include archived items in LIST mode (defaults to false to hide archived items).",
      ),
  },
  async execute(args) {
    // READ MODE: Return full item with data
    if (args.id) {
      // Try YAML first (canonical)
      const yamlItem = await readYamlItem(args.id);
      if (yamlItem) {
        return JSON.stringify({ found: true, item: yamlItem }, null, 2);
      }

      // Fall back to legacy JSON
      const legacy = await readLegacyJson();
      if (legacy.ok) {
        const found = legacy.items.find((it) => it.id === args.id);
        if (found) {
          return JSON.stringify({ found: true, item: found }, null, 2);
        }
      }

      return JSON.stringify({ found: false, item: null }, null, 2);
    }

    // LIST MODE: Merge YAML + legacy, YAML wins on duplicates
    const yamlItems = await readAllYamlItems();

    const legacy = await readLegacyJson();
    const legacyItems = legacy.ok ? legacy.items : [];

    const merged = mergeItems(yamlItems, legacyItems);

    const includeArchived = args.includeArchived ?? false;

    const list = merged
      .filter((it) => {
        if (!includeArchived && it.status === "archived") {
          return false;
        }
        if (args.tags && args.tags.length > 0) {
          return args.tags.every((t) => it.tags?.includes(t));
        }
        return true;
      })
      .map((it) => ({
        id: it.id,
        summary: it.summary,
        tags: it.tags,
        status: it.status,
        links: it.links,
        createdAt: it.createdAt,
        updatedAt: it.updatedAt,
      }));

    return JSON.stringify({ list }, null, 2);
  },
});
