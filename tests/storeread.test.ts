import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { YAML } from "bun";
import fs from "fs/promises";
import os from "os";
import path from "path";

import storereadTool from "../tools/storeread";

const YAML_ITEM = {
  id: "a1b2c3d4e5f6",
  summary: "YAML item",
  tags: ["auth", "critical"],
  status: "active" as const,
  data: { key: "yaml-value" },
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-02T00:00:00.000Z",
};

const LEGACY_ITEMS = [
  {
    id: "aaa-111",
    summary: "Legacy first",
    tags: ["auth", "critical"],
    status: "active",
    data: { key: "value1" },
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-02T00:00:00.000Z",
  },
  {
    id: "bbb-222",
    summary: "Legacy second",
    tags: ["database"],
    status: "archived",
    data: { key: "value2" },
    createdAt: "2024-01-03T00:00:00.000Z",
    updatedAt: "2024-01-04T00:00:00.000Z",
  },
];

let originalCwd: string;
let tmpDir: string;

beforeEach(async () => {
  originalCwd = process.cwd();
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "storeread-test-"));
  process.chdir(tmpDir);
});

afterEach(async () => {
  process.chdir(originalCwd);
  if (tmpDir) {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

async function writeLegacyStore(items: unknown[]): Promise<void> {
  const storePath = path.join(tmpDir, ".opencode", "sessions", "store.json");
  await fs.mkdir(path.dirname(storePath), { recursive: true });
  await fs.writeFile(storePath, JSON.stringify(items, null, 2), "utf-8");
}

async function writeYamlItem(item: Record<string, unknown>): Promise<void> {
  const dir = path.join(tmpDir, ".opencode", "sessions", "store");
  await fs.mkdir(dir, { recursive: true });
  const encoded = (item.id as string).replace(/[^a-zA-Z0-9_-]/g, (ch) => {
    const hex = ch.charCodeAt(0).toString(16).padStart(2, "0");
    return `%${hex}`;
  });
  await fs.writeFile(
    path.join(dir, `${encoded}.yaml`),
    YAML.stringify(item),
    "utf-8",
  );
}

async function runTool(args: Parameters<typeof storereadTool.execute>[0]) {
  const raw = await storereadTool.execute(args, {} as any);
  return JSON.parse(raw);
}

describe("storeread tool", () => {
  describe("list mode - YAML only", () => {
    test("returns empty list when no store exists", async () => {
      const result = await runTool({ id: undefined });
      expect(result).toEqual({ list: [] });
    });

    test("returns YAML items", async () => {
      await writeYamlItem(YAML_ITEM);
      const result = await runTool({});
      expect(result.list).toHaveLength(1);
      expect(result.list[0].id).toBe(YAML_ITEM.id);
      expect(result.list[0].summary).toBe("YAML item");
    });

    test("list entries do not include data field", async () => {
      await writeYamlItem(YAML_ITEM);
      const result = await runTool({});
      for (const item of result.list) {
        expect(item).not.toHaveProperty("data");
      }
    });
  });

  describe("list mode - legacy JSON only", () => {
    test("returns legacy items when no YAML dir exists", async () => {
      await writeLegacyStore(LEGACY_ITEMS);
      const result = await runTool({});
      // Only active items (archived excluded by default)
      expect(result.list).toHaveLength(1);
      expect(result.list[0].id).toBe("aaa-111");
    });

    test("returns empty list for invalid JSON", async () => {
      const storePath = path.join(
        tmpDir,
        ".opencode",
        "sessions",
        "store.json",
      );
      await fs.mkdir(path.dirname(storePath), { recursive: true });
      await fs.writeFile(storePath, "not a json", "utf-8");
      const result = await runTool({});
      expect(result).toEqual({ list: [] });
    });
  });

  describe("list mode - hybrid reads", () => {
    test("returns union of YAML and legacy items", async () => {
      await writeYamlItem(YAML_ITEM);
      await writeLegacyStore(LEGACY_ITEMS);
      const result = await runTool({ includeArchived: true });
      // YAML_ITEM + aaa-111 + bbb-222 = 3 items (no duplicates)
      expect(result.list).toHaveLength(3);
      const ids = result.list.map((it: any) => it.id).sort();
      expect(ids).toEqual(["a1b2c3d4e5f6", "aaa-111", "bbb-222"]);
    });

    test("YAML takes precedence over legacy for duplicate IDs", async () => {
      const duplicateId = "aaa-111";
      const yamlVersion = {
        id: duplicateId,
        summary: "YAML wins",
        tags: ["yaml"],
        status: "active" as const,
        createdAt: "2024-06-01T00:00:00.000Z",
        updatedAt: "2024-06-01T00:00:00.000Z",
      };
      await writeYamlItem(yamlVersion);
      await writeLegacyStore(LEGACY_ITEMS);

      const result = await runTool({});
      const item = result.list.find((it: any) => it.id === duplicateId);
      expect(item.summary).toBe("YAML wins");
      expect(item.tags).toEqual(["yaml"]);
    });
  });

  describe("list mode - filters", () => {
    test("excludes archived items by default", async () => {
      await writeLegacyStore(LEGACY_ITEMS);
      const result = await runTool({});
      expect(result.list).toHaveLength(1);
      expect(result.list[0].id).toBe("aaa-111");
    });

    test("includes archived items when explicitly requested", async () => {
      await writeLegacyStore(LEGACY_ITEMS);
      const result = await runTool({ includeArchived: true });
      expect(result.list).toHaveLength(2);
    });

    test("filters items by tags with AND logic", async () => {
      await writeLegacyStore(LEGACY_ITEMS);
      const result = await runTool({ tags: ["auth", "critical"] });
      expect(result.list).toHaveLength(1);
      expect(result.list[0].id).toBe("aaa-111");
    });

    test("excludes items that do not match all tags", async () => {
      await writeLegacyStore(LEGACY_ITEMS);
      const result = await runTool({ tags: ["auth", "database"] });
      expect(result.list).toEqual([]);
    });

    test("empty tags array returns all non-archived items", async () => {
      await writeLegacyStore(LEGACY_ITEMS);
      const result = await runTool({ tags: [] });
      expect(result.list).toHaveLength(1);
    });

    test("tag filtering works with archived included", async () => {
      await writeLegacyStore(LEGACY_ITEMS);
      const result = await runTool({
        tags: ["database"],
        includeArchived: true,
      });
      expect(result.list).toHaveLength(1);
      expect(result.list[0].id).toBe("bbb-222");
    });

    test("list entries include expected summary fields without data", async () => {
      await writeLegacyStore(LEGACY_ITEMS);
      const result = await runTool({});
      for (const item of result.list) {
        expect(item).toMatchObject({
          id: expect.any(String),
          summary: expect.any(String),
          tags: expect.any(Array),
          status: expect.any(String),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        });
        expect(item).not.toHaveProperty("data");
      }
    });
  });

  describe("read mode", () => {
    test("returns YAML item by id", async () => {
      await writeYamlItem(YAML_ITEM);
      const result = await runTool({ id: YAML_ITEM.id });
      expect(result.found).toBe(true);
      expect(result.item.id).toBe(YAML_ITEM.id);
      expect(result.item.data).toEqual({ key: "yaml-value" });
    });

    test("returns legacy item by id when no YAML exists", async () => {
      await writeLegacyStore(LEGACY_ITEMS);
      const result = await runTool({ id: "aaa-111" });
      expect(result).toEqual({ found: true, item: LEGACY_ITEMS[0] });
    });

    test("YAML item wins over legacy item with same id in read mode", async () => {
      const yamlVersion = {
        ...LEGACY_ITEMS[0],
        summary: "YAML version wins",
        data: { source: "yaml" },
      };
      await writeYamlItem(yamlVersion);
      await writeLegacyStore(LEGACY_ITEMS);

      const result = await runTool({ id: "aaa-111" });
      expect(result.found).toBe(true);
      expect(result.item.summary).toBe("YAML version wins");
      expect(result.item.data).toEqual({ source: "yaml" });
    });

    test("returns found false when id missing everywhere", async () => {
      await writeLegacyStore(LEGACY_ITEMS);
      const result = await runTool({ id: "missing" });
      expect(result).toEqual({ found: false, item: null });
    });

    test("returns full item with data field", async () => {
      await writeLegacyStore(LEGACY_ITEMS);
      const result = await runTool({ id: "bbb-222" });
      expect(result.item).toHaveProperty("data");
      expect(result.item.data).toEqual({ key: "value2" });
    });

    test("reads item with old-style hyphenated id from legacy", async () => {
      await writeLegacyStore(LEGACY_ITEMS);
      const result = await runTool({ id: "aaa-111" });
      expect(result.found).toBe(true);
      expect(result.item.id).toBe("aaa-111");
    });
  });
});
