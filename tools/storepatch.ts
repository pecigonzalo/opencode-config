import { tool } from "@opencode-ai/plugin";
import {
  type StoreItem,
  readLegacyJson,
  removeLegacyItem,
  withYamlLock,
} from "./store-types.js";

export default tool({
  description:
    "Update an existing store item in place. Only the fields you provide " +
    "are changed; omitted fields are preserved. Use this to change status, " +
    "tags, summary, links, or data on a previously created item. Returns " +
    "not-found if the ID does not exist.",
  args: {
    id: tool.schema
      .string()
      .describe("Required: ID of the store item to update"),
    summary: tool.schema
      .string()
      .min(1)
      .optional()
      .describe("Optional: New summary to replace the existing one"),
    tags: tool.schema
      .array(tool.schema.string())
      .min(1)
      .optional()
      .describe("Optional: New tags array to replace the existing tags"),
    status: tool.schema
      .enum(["active", "archived", "deprecated"])
      .optional()
      .describe("Optional: New status value"),
    links: tool.schema
      .array(tool.schema.string())
      .optional()
      .describe("Optional: New links array to replace the existing links"),
    data: tool.schema
      .any()
      .optional()
      .describe("Optional: New data payload to replace the existing data"),
  },
  async execute(args) {
    const { id, ...patch } = args;

    // Use per-item YAML lock for the entire read→patch→write cycle.
    // This prevents concurrent patches to the same item from losing updates.
    return withYamlLock<string>(id, async (yamlItem) => {
      let existing = yamlItem;
      let fromLegacy = false;

      // Fall back to legacy JSON if not in YAML
      if (!existing) {
        const legacy = await readLegacyJson();
        if (!legacy.ok) {
          const errorMsg =
            legacy.error === "corrupt"
              ? "Store file is corrupted"
              : "Store not found";
          return {
            result: JSON.stringify(
              { success: false, id, found: false, error: errorMsg },
              null,
              2,
            ),
            item: undefined,
          };
        }
        const found = legacy.items.find((it) => it.id === id);
        if (!found) {
          return {
            result: JSON.stringify(
              { success: false, id, found: false, error: "Item not found" },
              null,
              2,
            ),
            item: undefined,
          };
        }
        existing = found;
        fromLegacy = true;
      }

      const now = new Date().toISOString();

      const updated: StoreItem = {
        ...existing,
        ...(patch.summary !== undefined && { summary: patch.summary }),
        ...(patch.tags !== undefined && { tags: patch.tags }),
        ...(patch.status !== undefined && { status: patch.status }),
        ...(patch.links !== undefined && { links: patch.links }),
        ...(patch.data !== undefined && { data: patch.data }),
        updatedAt: now,
      };

      // If migrated from legacy, remove from JSON (removeLegacyItem uses its own lock)
      if (fromLegacy) {
        await removeLegacyItem(id);
      }

      return {
        result: JSON.stringify({ success: true, id, found: true }, null, 2),
        item: updated,
      };
    });
  },
});
