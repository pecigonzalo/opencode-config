import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { YAML } from "bun";
import storewriteTool from "../tools/storewrite";
import fs from "fs/promises";
import os from "os";
import path from "path";

const yamlDir = (dir: string) =>
  path.join(dir, ".opencode", "sessions", "store");

async function readYamlItems(dir: string) {
  const storeDir = yamlDir(dir);
  const entries = await fs.readdir(storeDir);
  const items = [];
  for (const entry of entries) {
    if (!entry.endsWith(".yaml")) continue;
    const raw = await fs.readFile(path.join(storeDir, entry), "utf-8");
    items.push(YAML.parse(raw));
  }
  return items;
}

describe("storewrite tool", () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "storewrite-test-"));
    process.chdir(tmpDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  test("creates a YAML file and returns success with generated id", async () => {
    const response = await storewriteTool.execute(
      { summary: "capture context", tags: ["test"] },
      {} as any,
    );

    const parsed = JSON.parse(response);
    expect(parsed.success).toBe(true);
    expect(parsed.id).toMatch(/^[0-9a-f]{12}$/);

    const items = await readYamlItems(tmpDir);
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(parsed.id);
  });

  test("generated id is 12 lowercase hex characters", async () => {
    const response = await storewriteTool.execute(
      { summary: "id format check", tags: ["test"] },
      {} as any,
    );
    const { id } = JSON.parse(response);
    expect(id).toHaveLength(12);
    expect(id).toMatch(/^[0-9a-f]{12}$/);
  });

  test("written item has summary, tags, default status, createdAt, and updatedAt", async () => {
    const tags = ["alpha", "beta"];
    await storewriteTool.execute({ summary: "detail", tags }, {} as any);

    const [item] = await readYamlItems(tmpDir);
    expect(item.summary).toBe("detail");
    expect(item.tags).toEqual(tags);
    expect(item.status).toBe("active");
    expect(typeof item.createdAt).toBe("string");
    expect(typeof item.updatedAt).toBe("string");
    expect(item.createdAt).toBe(item.updatedAt);
  });

  test("written item includes data when provided", async () => {
    const payload = { foo: "bar", nested: { count: 3 } };
    await storewriteTool.execute(
      { summary: "data", tags: ["payload"], data: payload },
      {} as any,
    );

    const [item] = await readYamlItems(tmpDir);
    expect(item.data).toEqual(payload);
  });

  test("written item includes links when provided", async () => {
    const links = ["https://example.com/reference"];
    await storewriteTool.execute(
      { summary: "link", tags: ["refs"], links },
      {} as any,
    );

    const [item] = await readYamlItems(tmpDir);
    expect(item.links).toEqual(links);
  });

  test("each call creates a separate YAML file (create-only)", async () => {
    await storewriteTool.execute(
      { summary: "first", tags: ["one"], status: "active" },
      {} as any,
    );
    await storewriteTool.execute(
      { summary: "second", tags: ["two"], status: "active" },
      {} as any,
    );

    const items = await readYamlItems(tmpDir);
    expect(items).toHaveLength(2);
    const summaries = items.map((it: any) => it.summary).sort();
    expect(summaries).toEqual(["first", "second"]);
  });

  test("two calls produce distinct ids", async () => {
    const r1 = JSON.parse(
      await storewriteTool.execute({ summary: "a", tags: ["t"] }, {} as any),
    );
    const r2 = JSON.parse(
      await storewriteTool.execute({ summary: "b", tags: ["t"] }, {} as any),
    );
    expect(r1.id).not.toBe(r2.id);
  });

  test("new item id does not collide with ids already in store", async () => {
    const existingIds: string[] = [];
    for (let i = 0; i < 5; i++) {
      const r = JSON.parse(
        await storewriteTool.execute(
          { summary: `item ${i}`, tags: ["seed"] },
          {} as any,
        ),
      );
      existingIds.push(r.id);
    }

    const newR = JSON.parse(
      await storewriteTool.execute(
        { summary: "fresh", tags: ["new"] },
        {} as any,
      ),
    );
    expect(existingIds).not.toContain(newR.id);

    const items = await readYamlItems(tmpDir);
    expect(items).toHaveLength(6);
  });

  test("does not write to legacy store.json", async () => {
    await storewriteTool.execute(
      { summary: "yaml only", tags: ["test"] },
      {} as any,
    );

    const legacyPath = path.join(
      tmpDir,
      ".opencode",
      "sessions",
      "store.json",
    );
    let exists = true;
    try {
      await fs.access(legacyPath);
    } catch {
      exists = false;
    }
    expect(exists).toBe(false);
  });
});
