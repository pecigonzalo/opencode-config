import { tool } from "@opencode-ai/plugin";
import {
  readLegacyJson,
  removeLegacyItem,
  withYamlLock,
} from "./store-types.js";

export default tool({
  description:
    "Delete a stored item from the session store by ID. Permanently removes " +
    "the item. Use this to clean up obsolete, completed, or incorrect store " +
    "entries. Returns deleted=true if the item was found and removed, " +
    "deleted=false if the ID was not found.",
  args: {
    id: tool.schema
      .string()
      .describe("Required: ID of the item to delete from the store"),
  },
  async execute(args) {
    const { id } = args;

    // Delete from YAML under per-item lock
    const yamlDeleted = await withYamlLock<boolean>(id, async (current) => {
      if (current !== null) {
        return { result: true, item: null }; // null signals deletion
      }
      return { result: false, item: undefined }; // no-op
    });

    // Also clean up from legacy JSON if present (removeLegacyItem uses its own lock)
    let legacyDeleted = false;
    const legacy = await readLegacyJson();
    if (legacy.ok) {
      const exists = legacy.items.some((it) => it.id === id);
      if (exists) {
        legacyDeleted = await removeLegacyItem(id);
      }
    } else if (legacy.error === "corrupt") {
      // If YAML delete already succeeded, still report success
      if (!yamlDeleted) {
        return JSON.stringify(
          {
            success: false,
            id,
            deleted: false,
            error: "Store file is corrupted",
          },
          null,
          2,
        );
      }
    }

    const deleted = yamlDeleted || legacyDeleted;

    return JSON.stringify({ success: true, id, deleted }, null, 2);
  },
});
