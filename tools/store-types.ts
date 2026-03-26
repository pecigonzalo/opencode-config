import { YAML } from "bun";
import fs from "fs/promises";
import path from "path";

export type StoreItem = {
  id: string;
  summary: string;
  tags: string[];
  status?: "active" | "archived" | "deprecated";
  links?: string[];
  data?: unknown;
  updatedAt?: string;
  createdAt?: string;
};

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

/** Base directory for sessions store. */
export function storeDir(): string {
  return path.join(process.cwd(), ".opencode", "sessions", "store");
}

/** Legacy JSON store path. */
export function legacyJsonPath(): string {
  return path.join(process.cwd(), ".opencode", "sessions", "store.json");
}

// ---------------------------------------------------------------------------
// Filesystem-safe ID encoding
// ---------------------------------------------------------------------------

/**
 * Encodes an item ID to a filesystem-safe filename component.
 * Replaces non-alphanumeric/dash/underscore chars with percent-hex encoding.
 */
export function encodeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, (ch) => {
    const hex = ch.charCodeAt(0).toString(16).padStart(2, "0");
    return `%${hex}`;
  });
}

/** Returns the YAML file path for a given item ID. */
export function yamlPath(id: string): string {
  return path.join(storeDir(), `${encodeId(id)}.yaml`);
}

// ---------------------------------------------------------------------------
// Filesystem lock
// ---------------------------------------------------------------------------

const LOCK_POLL_MS = 10;
const LOCK_TIMEOUT_MS = 5_000;
const LOCK_STALE_MS = 30_000;

/**
 * Acquires an exclusive filesystem lock by creating a lockfile with O_EXCL.
 * Returns a release function. The lock auto-expires after LOCK_STALE_MS
 * to prevent permanent deadlock from crashed processes.
 *
 * Uses mkdir instead of file open because mkdir is atomic on all platforms
 * and doesn't require file descriptor management.
 */
export async function acquireLock(lockPath: string): Promise<() => Promise<void>> {
  const deadline = Date.now() + LOCK_TIMEOUT_MS;

  while (true) {
    try {
      // mkdir is atomic — fails with EEXIST if the dir already exists.
      await fs.mkdir(lockPath);
      // Lock acquired. Write a timestamp so stale locks can be detected.
      await fs.writeFile(
        path.join(lockPath, "pid"),
        `${process.pid}\n${Date.now()}`,
        "utf-8",
      ).catch(() => {
        // Best-effort metadata; lock is still held via the directory.
      });

      let released = false;
      const release = async () => {
        if (released) return;
        released = true;
        await fs.rm(lockPath, { recursive: true, force: true });
      };
      return release;
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        "code" in err &&
        (err as NodeJS.ErrnoException).code === "EEXIST"
      ) {
        // Lock is held. Check if it's stale.
        try {
          const pidFile = path.join(lockPath, "pid");
          const content = await fs.readFile(pidFile, "utf-8");
          const timestamp = Number(content.split("\n")[1]);
          if (!Number.isNaN(timestamp) && Date.now() - timestamp > LOCK_STALE_MS) {
            // Stale lock — force-remove and retry immediately.
            await fs.rm(lockPath, { recursive: true, force: true });
            continue;
          }
        } catch {
          // Can't read pid file — might be mid-creation. Check age of dir.
          try {
            const stat = await fs.stat(lockPath);
            if (Date.now() - stat.mtimeMs > LOCK_STALE_MS) {
              await fs.rm(lockPath, { recursive: true, force: true });
              continue;
            }
          } catch {
            // Dir disappeared between EEXIST and stat — retry.
            continue;
          }
        }

        if (Date.now() >= deadline) {
          throw new Error(`Lock timeout: could not acquire ${lockPath}`);
        }

        // Wait and retry.
        await new Promise((r) => setTimeout(r, LOCK_POLL_MS));
        continue;
      }
      // Unexpected error (e.g., parent dir missing). Rethrow.
      throw err;
    }
  }
}

/** Lock path for a YAML item. */
export function yamlLockPath(id: string): string {
  return yamlPath(id) + ".lock";
}

/** Lock path for the legacy JSON file. */
export function legacyLockPath(): string {
  return legacyJsonPath() + ".lock";
}

// ---------------------------------------------------------------------------
// Atomic write helper
// ---------------------------------------------------------------------------

/**
 * Writes content to a file atomically: write to a unique temp sibling first,
 * then rename. The random suffix prevents collisions when concurrent writers
 * target the same file (each gets its own temp path).
 */
export async function atomicWriteFile(
  filePath: string,
  content: string,
): Promise<void> {
  const random = Math.random().toString(36).slice(2, 10);
  const tmp = `${filePath}.${random}.tmp`;
  await fs.writeFile(tmp, content, "utf-8");
  await fs.rename(tmp, filePath);
}

// ---------------------------------------------------------------------------
// YAML item I/O
// ---------------------------------------------------------------------------

/** Write a single StoreItem as a YAML file. Creates directories as needed. */
export async function writeYamlItem(item: StoreItem): Promise<void> {
  const dir = storeDir();
  await fs.mkdir(dir, { recursive: true });
  const content = YAML.stringify(item);
  await atomicWriteFile(yamlPath(item.id), content);
}

/** Read a single YAML item by ID. Returns null if missing or unparseable. */
export async function readYamlItem(id: string): Promise<StoreItem | null> {
  try {
    const raw = await fs.readFile(yamlPath(id), "utf-8");
    const parsed = YAML.parse(raw);
    if (parsed && typeof parsed === "object" && "id" in parsed) {
      return parsed as StoreItem;
    }
    return null;
  } catch {
    return null;
  }
}

/** Delete the YAML file for an item. Returns true if file existed. */
export async function deleteYamlItem(id: string): Promise<boolean> {
  try {
    await fs.unlink(yamlPath(id));
    return true;
  } catch {
    return false;
  }
}

/** Read all YAML items from the store directory. */
export async function readAllYamlItems(): Promise<StoreItem[]> {
  const dir = storeDir();
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return [];
  }

  const items: StoreItem[] = [];
  for (const entry of entries) {
    if (!entry.endsWith(".yaml")) continue;
    try {
      const raw = await fs.readFile(path.join(dir, entry), "utf-8");
      const parsed = YAML.parse(raw);
      if (parsed && typeof parsed === "object" && "id" in parsed) {
        items.push(parsed as StoreItem);
      }
    } catch {
      // Skip corrupt YAML files
    }
  }
  return items;
}

// ---------------------------------------------------------------------------
// Locked mutation helpers
// ---------------------------------------------------------------------------

/**
 * Read-modify-write a single YAML item under its per-item lock.
 * The mutator receives the current item (null if missing) and returns:
 * - `item: StoreItem` → write the item
 * - `item: null` → delete the YAML file
 * - `item: undefined` → no filesystem change (no-op)
 */
export async function withYamlLock<T>(
  id: string,
  fn: (current: StoreItem | null) => Promise<{ result: T; item: StoreItem | null | undefined }>,
): Promise<T> {
  const dir = storeDir();
  await fs.mkdir(dir, { recursive: true });

  const release = await acquireLock(yamlLockPath(id));
  try {
    const current = await readYamlItem(id);
    const { result, item } = await fn(current);

    if (item === null) {
      // Delete
      await deleteYamlItem(id);
    } else if (item !== undefined) {
      // Write
      await writeYamlItem(item);
    }

    return result;
  } finally {
    await release();
  }
}

/**
 * Execute a mutating operation on the legacy JSON store under lock.
 * The mutator receives the current items array and returns the new array.
 */
export async function withLegacyLock<T>(
  fn: (result: LegacyReadResult) => Promise<{ result: T; items?: StoreItem[] }>,
): Promise<T> {
  const dir = path.dirname(legacyJsonPath());
  await fs.mkdir(dir, { recursive: true });

  const release = await acquireLock(legacyLockPath());
  try {
    const current = await readLegacyJson();
    const outcome = await fn(current);

    if (outcome.items !== undefined) {
      await writeLegacyJson(outcome.items);
    }

    return outcome.result;
  } finally {
    await release();
  }
}

// ---------------------------------------------------------------------------
// Legacy JSON I/O
// ---------------------------------------------------------------------------

export type LegacyReadResult =
  | { ok: true; items: StoreItem[] }
  | { ok: false; error: "missing" | "corrupt" };

/** Read the legacy store.json. */
export async function readLegacyJson(): Promise<LegacyReadResult> {
  const file = legacyJsonPath();
  let raw: string;
  try {
    raw = await fs.readFile(file, "utf-8");
  } catch {
    return { ok: false, error: "missing" };
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return { ok: true, items: parsed };
    }
    return { ok: true, items: [] };
  } catch {
    return { ok: false, error: "corrupt" };
  }
}

/** Write items back to legacy store.json. Creates directories as needed. */
export async function writeLegacyJson(items: StoreItem[]): Promise<void> {
  const file = legacyJsonPath();
  await fs.mkdir(path.dirname(file), { recursive: true });
  await atomicWriteFile(file, JSON.stringify(items, null, 2));
}

/**
 * Remove a single item from legacy store.json by ID, under lock.
 * Returns whether the item was found and removed.
 */
export async function removeLegacyItem(id: string): Promise<boolean> {
  return withLegacyLock(async (current) => {
    if (!current.ok) return { result: false };

    const before = current.items.length;
    const after = current.items.filter((it) => it.id !== id);
    if (after.length === before) return { result: false };

    return { result: true, items: after };
  });
}
