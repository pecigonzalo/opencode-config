import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { YAML } from "bun";
import storedeleteTool from "../tools/storedelete";
import fs from "fs/promises";
import path from "path";
import os from "os";

const STORE_JSON_REL = path.join(".opencode", "sessions", "store.json");
const STORE_YAML_REL = path.join(".opencode", "sessions", "store");

const LEGACY_ITEMS = [
  {
    id: "aaa-111",
    summary: "Item A",
    tags: ["x"],
    status: "active",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "bbb-222",
    summary: "Item B",
    tags: ["y"],
    status: "active",
    createdAt: "2024-01-02T00:00:00.000Z",
    updatedAt: "2024-01-02T00:00:00.000Z",
  },
];

const YAML_ITEM = {
  id: "c1d2e3f4a5b6",
  summary: "YAML Item C",
  tags: ["z"],
  status: "active" as const,
  createdAt: "2024-02-01T00:00:00.000Z",
  updatedAt: "2024-02-01T00:00:00.000Z",
};

let originalCwd: string;
let tmpDir: string;

beforeEach(async () => {
  originalCwd = process.cwd();
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "storedelete-test-"));
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
  return JSON.parse(
    await fs.readFile(path.join(tmpDir, STORE_JSON_REL), "utf-8"),
  );
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

describe("storedelete tool", () => {
  describe("when no store exists", () => {
    test("returns success with deleted=false when nothing exists", async () => {
      const id = "missing-id";
      const result = JSON.parse(
        await storedeleteTool.execute({ id }, {} as any),
      );
      expect(result).toEqual({ success: true, id, deleted: false });
    });
  });

  describe("YAML item deletion", () => {
    test("deletes YAML item and returns deleted=true", async () => {
      await writeYamlItem(YAML_ITEM);

      const result = JSON.parse(
        await storedeleteTool.execute({ id: YAML_ITEM.id }, {} as any),
      );

      expect(result).toEqual({
        success: true,
        id: YAML_ITEM.id,
        deleted: true,
      });
      expect(await yamlExists(YAML_ITEM.id)).toBe(false);
    });

    test("returns deleted=false when YAML item does not exist", async () => {
      const result = JSON.parse(
        await storedeleteTool.execute({ id: "nonexistent" }, {} as any),
      );
      expect(result).toEqual({
        success: true,
        id: "nonexistent",
        deleted: false,
      });
    });
  });

  describe("legacy JSON deletion", () => {
    test("deletes from legacy JSON when item only exists there", async () => {
      await writeLegacyStore(LEGACY_ITEMS);

      const id = LEGACY_ITEMS[0].id;
      const result = JSON.parse(
        await storedeleteTool.execute({ id }, {} as any),
      );

      expect(result).toEqual({ success: true, id, deleted: true });

      const updated = await readLegacyStore();
      expect(updated).toEqual([LEGACY_ITEMS[1]]);
    });

    test("preserves other legacy items after delete", async () => {
      await writeLegacyStore(LEGACY_ITEMS);

      await storedeleteTool.execute({ id: LEGACY_ITEMS[0].id }, {} as any);

      const remaining = await readLegacyStore();
      expect(remaining).toHaveLength(1);
      expect(remaining[0]).toEqual(LEGACY_ITEMS[1]);
    });

    test("returns deleted=false when id not found in legacy JSON", async () => {
      await writeLegacyStore(LEGACY_ITEMS);
      const before = await readLegacyStore();

      const result = JSON.parse(
        await storedeleteTool.execute({ id: "ccc-333" }, {} as any),
      );

      expect(result).toEqual({ success: true, id: "ccc-333", deleted: false });
      const after = await readLegacyStore();
      expect(after).toEqual(before);
    });
  });

  describe("both YAML and legacy deletion", () => {
    test("deletes from both YAML and legacy when item exists in both", async () => {
      const duplicateItem = { ...LEGACY_ITEMS[0] };
      await writeYamlItem(duplicateItem);
      await writeLegacyStore(LEGACY_ITEMS);

      const result = JSON.parse(
        await storedeleteTool.execute({ id: duplicateItem.id }, {} as any),
      );

      expect(result).toEqual({
        success: true,
        id: duplicateItem.id,
        deleted: true,
      });
      expect(await yamlExists(duplicateItem.id)).toBe(false);

      const legacy = await readLegacyStore();
      const found = legacy.find((it: any) => it.id === duplicateItem.id);
      expect(found).toBeUndefined();
    });
  });

  describe("corrupt legacy JSON", () => {
    test("returns error when legacy JSON is corrupt and no YAML exists", async () => {
      const dir = path.join(tmpDir, ".opencode", "sessions");
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, "store.json"), "not-json", "utf-8");

      const result = JSON.parse(
        await storedeleteTool.execute({ id: "corrupt-id" }, {} as any),
      );

      expect(result).toEqual({
        success: false,
        id: "corrupt-id",
        deleted: false,
        error: "Store file is corrupted",
      });
    });

    test("succeeds when YAML delete works even if legacy JSON is corrupt", async () => {
      await writeYamlItem(YAML_ITEM);
      const dir = path.join(tmpDir, ".opencode", "sessions");
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, "store.json"), "not-json", "utf-8");

      const result = JSON.parse(
        await storedeleteTool.execute({ id: YAML_ITEM.id }, {} as any),
      );

      expect(result).toEqual({
        success: true,
        id: YAML_ITEM.id,
        deleted: true,
      });
      expect(await yamlExists(YAML_ITEM.id)).toBe(false);
    });
  });

  describe("deleting the only item", () => {
    test("YAML: removing only item leaves empty directory", async () => {
      await writeYamlItem(YAML_ITEM);

      await storedeleteTool.execute({ id: YAML_ITEM.id }, {} as any);

      expect(await yamlExists(YAML_ITEM.id)).toBe(false);
      // Directory still exists but is empty of yaml files
      const dir = path.join(tmpDir, STORE_YAML_REL);
      const entries = await fs.readdir(dir);
      const yamlFiles = entries.filter((e) => e.endsWith(".yaml"));
      expect(yamlFiles).toHaveLength(0);
    });

    test("legacy: deleting the only item writes an empty array", async () => {
      await writeLegacyStore([LEGACY_ITEMS[0]]);

      const result = JSON.parse(
        await storedeleteTool.execute(
          { id: LEGACY_ITEMS[0].id },
          {} as any,
        ),
      );

      expect(result.deleted).toBe(true);
      const updated = await readLegacyStore();
      expect(updated).toEqual([]);
    });
  });

  describe("concurrency", () => {
    test("concurrent deletes of the same YAML item do not error", async () => {
      await writeYamlItem(YAML_ITEM);

      const deletes = [
        storedeleteTool.execute({ id: YAML_ITEM.id }, {} as any),
        storedeleteTool.execute({ id: YAML_ITEM.id }, {} as any),
      ];

      const results = (await Promise.all(deletes)).map((r) => JSON.parse(r));

      // At least one must report deleted=true; the other may report false
      const anyDeleted = results.some((r) => r.deleted);
      expect(anyDeleted).toBe(true);

      // Both must be success=true (no errors)
      for (const r of results) {
        expect(r.success).toBe(true);
      }

      // File must be gone
      expect(await yamlExists(YAML_ITEM.id)).toBe(false);
    });

    test("concurrent deletes of different items do not interfere", async () => {
      const itemA = { ...YAML_ITEM, id: "aaaa11112222" };
      const itemB = { ...YAML_ITEM, id: "bbbb33334444", summary: "Item B" };
      await writeYamlItem(itemA);
      await writeYamlItem(itemB);

      const deletes = [
        storedeleteTool.execute({ id: itemA.id }, {} as any),
        storedeleteTool.execute({ id: itemB.id }, {} as any),
      ];

      const results = (await Promise.all(deletes)).map((r) => JSON.parse(r));

      for (const r of results) {
        expect(r.success).toBe(true);
        expect(r.deleted).toBe(true);
      }

      expect(await yamlExists(itemA.id)).toBe(false);
      expect(await yamlExists(itemB.id)).toBe(false);
    });

    test("concurrent legacy deletes do not corrupt the JSON file", async () => {
      const items = [
        { ...LEGACY_ITEMS[0] },
        { ...LEGACY_ITEMS[1] },
      ];
      await writeLegacyStore(items);

      const deletes = [
        storedeleteTool.execute({ id: items[0].id }, {} as any),
        storedeleteTool.execute({ id: items[1].id }, {} as any),
      ];

      const results = (await Promise.all(deletes)).map((r) => JSON.parse(r));

      for (const r of results) {
        expect(r.success).toBe(true);
        expect(r.deleted).toBe(true);
      }

      // Legacy JSON should be a valid array with both items removed
      const remaining = await readLegacyStore();
      expect(remaining).toEqual([]);
    });
  });
});
