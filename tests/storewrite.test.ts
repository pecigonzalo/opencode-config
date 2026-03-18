import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import storewriteTool from "../tools/storewrite";
import fs from "fs/promises";
import os from "os";
import path from "path";

const readStore = async (dir: string) =>
  JSON.parse(
    await fs.readFile(path.join(dir, ".opencode", "sessions", "store.json"), "utf-8"),
  );

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

  test("creates store file and returns success with generated id", async () => {
    const response = await storewriteTool.execute(
      { summary: "capture context", tags: ["test"] },
      {} as any,
    );

    const parsed = JSON.parse(response);
    expect(parsed.success).toBe(true);
    expect(parsed.id).toMatch(/^[0-9a-f]{12}$/);

    const store = await readStore(tmpDir);
    expect(store).toHaveLength(1);
    expect(store[0].id).toBe(parsed.id);
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

    const [item] = await readStore(tmpDir);
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

    const [item] = await readStore(tmpDir);
    expect(item.data).toEqual(payload);
  });

  test("written item includes links when provided", async () => {
    const links = ["https://example.com/reference"];
    await storewriteTool.execute(
      { summary: "link", tags: ["refs"], links },
      {} as any,
    );

    const [item] = await readStore(tmpDir);
    expect(item.links).toEqual(links);
  });

  test("each call always creates a new item (create-only)", async () => {
    await storewriteTool.execute(
      { summary: "first", tags: ["one"], status: "active" },
      {} as any,
    );
    await storewriteTool.execute(
      { summary: "second", tags: ["two"], status: "active" },
      {} as any,
    );

    const store = await readStore(tmpDir);
    expect(store).toHaveLength(2);
    expect(store[0].summary).toBe("first");
    expect(store[1].summary).toBe("second");
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
    // Pre-seed the store with every possible 12-hex-char ID except one to
    // exercise the collision-retry path. Doing that literally would be
    // impractical, so instead we pre-populate a handful of items and verify
    // the returned id is not among them.
    const existingIds: string[] = [];
    for (let i = 0; i < 5; i++) {
      const r = JSON.parse(
        await storewriteTool.execute({ summary: `item ${i}`, tags: ["seed"] }, {} as any),
      );
      existingIds.push(r.id);
    }

    const newR = JSON.parse(
      await storewriteTool.execute({ summary: "fresh", tags: ["new"] }, {} as any),
    );
    expect(existingIds).not.toContain(newR.id);

    const store = await readStore(tmpDir);
    expect(store).toHaveLength(6);
  });

  test("corrupt store file is backed up and replaced", async () => {
    const sessionsDir = path.join(tmpDir, ".opencode", "sessions");
    await fs.mkdir(sessionsDir, { recursive: true });
    const file = path.join(sessionsDir, "store.json");
    await fs.writeFile(file, "not valid json", "utf-8");

    await storewriteTool.execute({ summary: "reset", tags: ["drop"] }, {} as any);

    const store = await readStore(tmpDir);
    expect(store).toHaveLength(1);

    const backup = await fs.readFile(file + ".bak", "utf-8");
    expect(backup).toBe("not valid json");
  });

  test("empty store array is replaced with new item", async () => {
    const sessionsDir = path.join(tmpDir, ".opencode", "sessions");
    await fs.mkdir(sessionsDir, { recursive: true });
    const file = path.join(sessionsDir, "store.json");
    await fs.writeFile(file, "[]", "utf-8");

    await storewriteTool.execute({ summary: "array", tags: ["empty"] }, {} as any);

    const store = await readStore(tmpDir);
    expect(store).toHaveLength(1);
  });
});
