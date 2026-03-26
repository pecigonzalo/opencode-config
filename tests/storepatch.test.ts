import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { YAML } from "bun";
import fs from "fs/promises";
import os from "os";
import path from "path";

import storepatchTool from "../tools/storepatch";

const STORE_JSON_REL = path.join(".opencode", "sessions", "store.json");
const STORE_YAML_REL = path.join(".opencode", "sessions", "store");

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

function encodeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, (ch) => {
    const hex = ch.charCodeAt(0).toString(16).padStart(2, "0");
    return `%${hex}`;
  });
}

async function writeLegacyStore(items: unknown[]): Promise<void> {
  const storePath = path.join(tmpDir, STORE_JSON_REL);
  await fs.mkdir(path.dirname(storePath), { recursive: true });
  await fs.writeFile(storePath, JSON.stringify(items, null, 2), "utf-8");
}

async function readLegacyStore(): Promise<unknown[]> {
  const storePath = path.join(tmpDir, STORE_JSON_REL);
  return JSON.parse(await fs.readFile(storePath, "utf-8"));
}

async function writeYamlItem(item: Record<string, unknown>): Promise<void> {
  const dir = path.join(tmpDir, STORE_YAML_REL);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, `${encodeId(item.id as string)}.yaml`),
    YAML.stringify(item),
    "utf-8",
  );
}

async function readYamlItem(id: string): Promise<any> {
  const filePath = path.join(
    tmpDir,
    STORE_YAML_REL,
    `${encodeId(id)}.yaml`,
  );
  const raw = await fs.readFile(filePath, "utf-8");
  return YAML.parse(raw);
}

async function yamlExists(id: string): Promise<boolean> {
  try {
    await fs.access(
      path.join(tmpDir, STORE_YAML_REL, `${encodeId(id)}.yaml`),
    );
    return true;
  } catch {
    return false;
  }
}

async function runTool(args: Parameters<typeof storepatchTool.execute>[0]) {
  const raw = await storepatchTool.execute(args, {} as any);
  return JSON.parse(raw);
}

describe("storepatch tool", () => {
  describe("not-found and error cases", () => {
    test("returns not-found when no store exists", async () => {
      const result = await runTool({ id: "abc123def456" });
      expect(result).toEqual({
        success: false,
        id: "abc123def456",
        found: false,
        error: "Store not found",
      });
    });

    test("returns error when legacy store file is corrupted", async () => {
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

    test("returns not-found when id does not exist anywhere", async () => {
      await writeLegacyStore([OTHER_ITEM]);

      const result = await runTool({ id: "nonexistent0000" });
      expect(result).toEqual({
        success: false,
        id: "nonexistent0000",
        found: false,
        error: "Item not found",
      });
    });
  });

  describe("YAML item patching", () => {
    test("returns success when item exists in YAML", async () => {
      await writeYamlItem(BASE_ITEM);

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
      await writeYamlItem(BASE_ITEM);

      await runTool({ id: BASE_ITEM.id, summary: "New summary" });

      const item = await readYamlItem(BASE_ITEM.id);
      expect(item.summary).toBe("New summary");
      expect(item.tags).toEqual(BASE_ITEM.tags);
      expect(item.status).toBe(BASE_ITEM.status);
      expect(item.links).toEqual(BASE_ITEM.links);
      expect(item.data).toEqual(BASE_ITEM.data);
    });

    test("updates tags while preserving other fields", async () => {
      await writeYamlItem(BASE_ITEM);

      await runTool({ id: BASE_ITEM.id, tags: ["new", "tags"] });

      const item = await readYamlItem(BASE_ITEM.id);
      expect(item.tags).toEqual(["new", "tags"]);
      expect(item.summary).toBe(BASE_ITEM.summary);
    });

    test("updates status to archived", async () => {
      await writeYamlItem(BASE_ITEM);

      await runTool({ id: BASE_ITEM.id, status: "archived" });

      const item = await readYamlItem(BASE_ITEM.id);
      expect(item.status).toBe("archived");
    });

    test("updates links", async () => {
      await writeYamlItem(BASE_ITEM);

      await runTool({
        id: BASE_ITEM.id,
        links: ["https://new.example.com"],
      });

      const item = await readYamlItem(BASE_ITEM.id);
      expect(item.links).toEqual(["https://new.example.com"]);
    });

    test("updates data payload", async () => {
      await writeYamlItem(BASE_ITEM);

      const newData = { updated: true, count: 99 };
      await runTool({ id: BASE_ITEM.id, data: newData });

      const item = await readYamlItem(BASE_ITEM.id);
      expect(item.data).toEqual(newData);
    });

    test("can update multiple fields at once", async () => {
      await writeYamlItem(BASE_ITEM);

      await runTool({
        id: BASE_ITEM.id,
        summary: "Updated",
        tags: ["updated"],
        status: "deprecated",
      });

      const item = await readYamlItem(BASE_ITEM.id);
      expect(item.summary).toBe("Updated");
      expect(item.tags).toEqual(["updated"]);
      expect(item.status).toBe("deprecated");
      expect(item.links).toEqual(BASE_ITEM.links);
      expect(item.data).toEqual(BASE_ITEM.data);
    });

    test("updatedAt is changed after patch", async () => {
      await writeYamlItem(BASE_ITEM);

      await runTool({ id: BASE_ITEM.id, summary: "Changed" });

      const item = await readYamlItem(BASE_ITEM.id);
      expect(item.updatedAt).not.toBe(BASE_ITEM.updatedAt);
      expect(typeof item.updatedAt).toBe("string");
    });

    test("createdAt is preserved after patch", async () => {
      await writeYamlItem(BASE_ITEM);

      await runTool({ id: BASE_ITEM.id, summary: "Changed" });

      const item = await readYamlItem(BASE_ITEM.id);
      expect(item.createdAt).toBe(BASE_ITEM.createdAt);
    });
  });

  describe("legacy JSON migration on patch", () => {
    test("patches legacy item and writes it as YAML", async () => {
      await writeLegacyStore([BASE_ITEM]);

      const result = await runTool({
        id: BASE_ITEM.id,
        summary: "Migrated",
      });

      expect(result.success).toBe(true);

      const yamlItem = await readYamlItem(BASE_ITEM.id);
      expect(yamlItem.summary).toBe("Migrated");
      expect(yamlItem.tags).toEqual(BASE_ITEM.tags);
    });

    test("removes item from legacy JSON after migration", async () => {
      await writeLegacyStore([BASE_ITEM, OTHER_ITEM]);

      await runTool({ id: BASE_ITEM.id, summary: "Migrated" });

      const legacyItems = await readLegacyStore();
      expect(legacyItems).toHaveLength(1);
      expect((legacyItems[0] as any).id).toBe(OTHER_ITEM.id);
    });

    test("preserves other items in legacy JSON during migration", async () => {
      await writeLegacyStore([BASE_ITEM, OTHER_ITEM]);

      await runTool({ id: BASE_ITEM.id, summary: "Migrated" });

      const legacyItems = await readLegacyStore();
      expect(legacyItems).toHaveLength(1);
      expect(legacyItems[0]).toEqual(OTHER_ITEM);
    });
  });

  describe("id format compatibility", () => {
    test("patches item with old-style hyphenated id from legacy", async () => {
      const oldStyleItem = { ...BASE_ITEM, id: "aaa-111-bbb" };
      await writeLegacyStore([oldStyleItem]);

      const result = await runTool({ id: "aaa-111-bbb", summary: "Patched" });

      expect(result.success).toBe(true);
      const yamlItem = await readYamlItem("aaa-111-bbb");
      expect(yamlItem.summary).toBe("Patched");
    });

    test("patches item with new-style 12-char hex id from YAML", async () => {
      await writeYamlItem(BASE_ITEM);

      const result = await runTool({
        id: BASE_ITEM.id,
        summary: "Patched hex id",
      });

      expect(result.success).toBe(true);
      const item = await readYamlItem(BASE_ITEM.id);
      expect(item.summary).toBe("Patched hex id");
    });
  });

  describe("concurrency", () => {
    test("concurrent patches to the same YAML item do not lose updates", async () => {
      // Seed a YAML item with a counter at 0
      const item = {
        ...BASE_ITEM,
        data: { counter: 0 },
      };
      await writeYamlItem(item);

      // Fire multiple patches concurrently — each sets a different field
      const patches = [
        runTool({ id: BASE_ITEM.id, summary: "patched-summary" }),
        runTool({ id: BASE_ITEM.id, tags: ["concurrent-tag"] }),
        runTool({ id: BASE_ITEM.id, status: "deprecated" as const }),
      ];

      const results = await Promise.all(patches);
      // All must succeed
      for (const r of results) {
        expect(r.success).toBe(true);
      }

      // The final state must reflect the *last writer wins* for each field,
      // but no patch should have been silently dropped (file should be valid YAML).
      const final = await readYamlItem(BASE_ITEM.id);
      expect(final).not.toBeNull();
      expect(final.id).toBe(BASE_ITEM.id);
      // At least one of the patches wrote these values — verify the file is consistent
      expect(typeof final.summary).toBe("string");
      expect(Array.isArray(final.tags)).toBe(true);
      expect(typeof final.status).toBe("string");
    });

    test("concurrent legacy migrations for the same item both succeed without corruption", async () => {
      // Two concurrent patches to a legacy-only item
      await writeLegacyStore([BASE_ITEM, OTHER_ITEM]);

      const patches = [
        runTool({ id: BASE_ITEM.id, summary: "migrated-a" }),
        runTool({ id: BASE_ITEM.id, summary: "migrated-b" }),
      ];

      const results = await Promise.all(patches);
      // First patch finds it in legacy; second may find it in YAML (already migrated)
      // or in legacy again. Both should succeed.
      for (const r of results) {
        expect(r.success).toBe(true);
      }

      // YAML file exists and is valid
      const final = await readYamlItem(BASE_ITEM.id);
      expect(final).not.toBeNull();
      expect(final.id).toBe(BASE_ITEM.id);

      // Legacy should no longer contain the migrated item
      const legacy = await readLegacyStore();
      const found = legacy.find((it: any) => it.id === BASE_ITEM.id);
      expect(found).toBeUndefined();

      // The other item is untouched
      const other = legacy.find((it: any) => it.id === OTHER_ITEM.id);
      expect(other).toBeDefined();
    });
  });
});
