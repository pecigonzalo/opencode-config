import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import fs from "fs/promises";
import os from "os";
import path from "path";

import storepatchTool from "../tools/storepatch";

const STORE_REL = path.join(".opencode", "sessions", "store.json");

const BASE_ITEM = {
  id: "abc123def456",
  summary: "Original summary",
  tags: ["original", "tag"],
  status: "active" as const,
  links: ["https://example.com"],
  data: { key: "original" },
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const OTHER_ITEM = {
  id: "zzzaaabbbccc",
  summary: "Other item",
  tags: ["other"],
  status: "active" as const,
  createdAt: "2024-01-02T00:00:00.000Z",
  updatedAt: "2024-01-02T00:00:00.000Z",
};

let tmpDir: string;
let originalCwd: string;

beforeEach(async () => {
  originalCwd = process.cwd();
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "storepatch-test-"));
  process.chdir(tmpDir);
});

afterEach(async () => {
  process.chdir(originalCwd);
  await fs.rm(tmpDir, { recursive: true, force: true });
});

async function writeStore(items: unknown[]): Promise<void> {
  const storePath = path.join(tmpDir, STORE_REL);
  await fs.mkdir(path.dirname(storePath), { recursive: true });
  await fs.writeFile(storePath, JSON.stringify(items, null, 2), "utf-8");
}

async function readStore(): Promise<unknown[]> {
  const storePath = path.join(tmpDir, STORE_REL);
  return JSON.parse(await fs.readFile(storePath, "utf-8"));
}

async function runTool(args: Parameters<typeof storepatchTool.execute>[0]) {
  const raw = await storepatchTool.execute(args, {} as any);
  return JSON.parse(raw);
}

describe("storepatch tool", () => {
  describe("not-found and error cases", () => {
    test("returns not-found when store file is missing", async () => {
      const result = await runTool({ id: "abc123def456" });

      expect(result).toEqual({
        success: false,
        id: "abc123def456",
        found: false,
        error: "Store not found",
      });
    });

    test("returns error when store file is corrupted", async () => {
      const sessionsDir = path.join(tmpDir, ".opencode", "sessions");
      await fs.mkdir(sessionsDir, { recursive: true });
      await fs.writeFile(
        path.join(sessionsDir, "store.json"),
        "not-valid-json",
        "utf-8",
      );

      const result = await runTool({ id: "abc123def456" });

      expect(result).toEqual({
        success: false,
        id: "abc123def456",
        found: false,
        error: "Store file is corrupted",
      });
    });

    test("returns not-found when id does not exist in store", async () => {
      await writeStore([OTHER_ITEM]);

      const result = await runTool({ id: "nonexistent0000" });

      expect(result).toEqual({
        success: false,
        id: "nonexistent0000",
        found: false,
        error: "Item not found",
      });
    });

    test("store is not modified when id is not found", async () => {
      await writeStore([BASE_ITEM]);
      const before = await readStore();

      await runTool({ id: "nonexistent0000", summary: "new summary" });

      const after = await readStore();
      expect(after).toEqual(before);
    });
  });

  describe("happy path", () => {
    test("returns success and found=true when item exists", async () => {
      await writeStore([BASE_ITEM]);

      const result = await runTool({
        id: BASE_ITEM.id,
        summary: "Updated summary",
      });

      expect(result).toEqual({
        success: true,
        id: BASE_ITEM.id,
        found: true,
      });
    });

    test("updates summary while preserving all other fields", async () => {
      await writeStore([BASE_ITEM]);

      await runTool({ id: BASE_ITEM.id, summary: "New summary" });

      const [item] = await readStore() as any[];
      expect(item.summary).toBe("New summary");
      expect(item.tags).toEqual(BASE_ITEM.tags);
      expect(item.status).toBe(BASE_ITEM.status);
      expect(item.links).toEqual(BASE_ITEM.links);
      expect(item.data).toEqual(BASE_ITEM.data);
    });

    test("updates tags while preserving all other fields", async () => {
      await writeStore([BASE_ITEM]);

      await runTool({ id: BASE_ITEM.id, tags: ["new", "tags"] });

      const [item] = await readStore() as any[];
      expect(item.tags).toEqual(["new", "tags"]);
      expect(item.summary).toBe(BASE_ITEM.summary);
      expect(item.status).toBe(BASE_ITEM.status);
    });

    test("updates status to archived", async () => {
      await writeStore([BASE_ITEM]);

      await runTool({ id: BASE_ITEM.id, status: "archived" });

      const [item] = await readStore() as any[];
      expect(item.status).toBe("archived");
      expect(item.summary).toBe(BASE_ITEM.summary);
    });

    test("updates status to deprecated", async () => {
      await writeStore([BASE_ITEM]);

      await runTool({ id: BASE_ITEM.id, status: "deprecated" });

      const [item] = await readStore() as any[];
      expect(item.status).toBe("deprecated");
    });

    test("updates links while preserving other fields", async () => {
      await writeStore([BASE_ITEM]);

      await runTool({ id: BASE_ITEM.id, links: ["https://new.example.com"] });

      const [item] = await readStore() as any[];
      expect(item.links).toEqual(["https://new.example.com"]);
      expect(item.summary).toBe(BASE_ITEM.summary);
    });

    test("updates data payload while preserving other fields", async () => {
      await writeStore([BASE_ITEM]);

      const newData = { updated: true, count: 99 };
      await runTool({ id: BASE_ITEM.id, data: newData });

      const [item] = await readStore() as any[];
      expect(item.data).toEqual(newData);
      expect(item.summary).toBe(BASE_ITEM.summary);
    });

    test("can update multiple fields at once", async () => {
      await writeStore([BASE_ITEM]);

      await runTool({
        id: BASE_ITEM.id,
        summary: "Updated",
        tags: ["updated"],
        status: "deprecated",
      });

      const [item] = await readStore() as any[];
      expect(item.summary).toBe("Updated");
      expect(item.tags).toEqual(["updated"]);
      expect(item.status).toBe("deprecated");
      // Preserved fields
      expect(item.links).toEqual(BASE_ITEM.links);
      expect(item.data).toEqual(BASE_ITEM.data);
    });
  });

  describe("timestamp handling", () => {
    test("updatedAt is changed after patch", async () => {
      await writeStore([BASE_ITEM]);

      await runTool({ id: BASE_ITEM.id, summary: "Changed" });

      const [item] = await readStore() as any[];
      expect(item.updatedAt).not.toBe(BASE_ITEM.updatedAt);
      expect(typeof item.updatedAt).toBe("string");
    });

    test("createdAt is preserved after patch", async () => {
      await writeStore([BASE_ITEM]);

      await runTool({ id: BASE_ITEM.id, summary: "Changed" });

      const [item] = await readStore() as any[];
      expect(item.createdAt).toBe(BASE_ITEM.createdAt);
    });
  });

  describe("multi-item store", () => {
    test("patches only the target item and preserves sibling items", async () => {
      await writeStore([BASE_ITEM, OTHER_ITEM]);

      await runTool({ id: BASE_ITEM.id, summary: "Patched" });

      const store = await readStore() as any[];
      expect(store).toHaveLength(2);

      const patched = store.find((it: any) => it.id === BASE_ITEM.id);
      const other = store.find((it: any) => it.id === OTHER_ITEM.id);

      expect(patched.summary).toBe("Patched");
      expect(other).toEqual(OTHER_ITEM);
    });

    test("preserves item order when patching a non-first item", async () => {
      await writeStore([OTHER_ITEM, BASE_ITEM]);

      await runTool({ id: BASE_ITEM.id, status: "archived" });

      const store = await readStore() as any[];
      expect(store[0].id).toBe(OTHER_ITEM.id);
      expect(store[1].id).toBe(BASE_ITEM.id);
      expect(store[1].status).toBe("archived");
    });
  });

  describe("id format compatibility", () => {
    test("patches item with old-style hyphenated id", async () => {
      const oldStyleItem = { ...BASE_ITEM, id: "aaa-111-bbb" };
      await writeStore([oldStyleItem]);

      const result = await runTool({ id: "aaa-111-bbb", summary: "Patched" });

      expect(result.success).toBe(true);
      const [item] = await readStore() as any[];
      expect(item.summary).toBe("Patched");
    });

    test("patches item with new-style 12-char hex id", async () => {
      await writeStore([BASE_ITEM]);

      const result = await runTool({
        id: BASE_ITEM.id,
        summary: "Patched hex id",
      });

      expect(result.success).toBe(true);
      const [item] = await readStore() as any[];
      expect(item.summary).toBe("Patched hex id");
    });
  });
});
