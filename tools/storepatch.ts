declare const Bun: any;

import { tool } from "@opencode-ai/plugin";
import fs from "fs/promises";
import path from "path";
import { type StoreItem, writeFile } from "./store-types.js";

export default tool({
  description:
    "Update an existing store item in place. Only the fields you provide are changed; omitted fields are preserved. Use this to change status, tags, summary, links, or data on a previously created item. Returns not-found if the ID does not exist.",
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
  async execute(args, context) {
    const { id, ...patch } = args;
    const dir = path.join(process.cwd(), ".opencode", "sessions");
    const file = path.join(dir, "store.json");

    // Read the store file.
    let items: StoreItem[];

    try {
      const raw = await fs.readFile(file, "utf-8");
      try {
        const parsed = JSON.parse(raw);
        items = Array.isArray(parsed) ? parsed : [];
      } catch {
        // Corrupted store — do not silently create a new record.
        return JSON.stringify(
          {
            success: false,
            id,
            found: false,
            error: "Store file is corrupted",
          },
          null,
          2,
        );
      }
    } catch {
      // File does not exist — nothing to patch.
      return JSON.stringify(
        {
          success: false,
          id,
          found: false,
          error: "Store not found",
        },
        null,
        2,
      );
    }

    const index = items.findIndex((it) => it.id === id);
    if (index === -1) {
      return JSON.stringify(
        {
          success: false,
          id,
          found: false,
          error: "Item not found",
        },
        null,
        2,
      );
    }

    const existing = items[index];
    const now = new Date().toISOString();

    // Build updated item: only apply fields that were explicitly provided.
    const updated: StoreItem = {
      ...existing,
      ...(patch.summary !== undefined && { summary: patch.summary }),
      ...(patch.tags !== undefined && { tags: patch.tags }),
      ...(patch.status !== undefined && { status: patch.status }),
      ...(patch.links !== undefined && { links: patch.links }),
      ...(patch.data !== undefined && { data: patch.data }),
      // Always bump updatedAt; createdAt is preserved via spread above.
      updatedAt: now,
    };

    const updatedItems = [
      ...items.slice(0, index),
      updated,
      ...items.slice(index + 1),
    ];

    try {
      await fs.mkdir(dir, { recursive: true });
      await writeFile(file, JSON.stringify(updatedItems, null, 2));
    } catch {
      return JSON.stringify(
        {
          success: false,
          id,
          found: true,
          error: "Failed to write to store file",
        },
        null,
        2,
      );
    }

    return JSON.stringify({ success: true, id, found: true }, null, 2);
  },
});
