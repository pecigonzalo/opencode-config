import type { Plugin } from "@opencode-ai/plugin";
import fs from "fs/promises";
import path from "path";

/**
 * SessionState tracks items (skills) for a session.
 */
interface SessionState {
  items: Set<string>;
  needsReload?: boolean;
}

type PersistedState = Record<
  string,
  { items: string[]; needsReload?: boolean }
>;

export const SkillPreservationPlugin: Plugin = async (ctx) => {
  const { directory } = ctx;
  const dataPath = path.join(
    directory,
    ".opencode",
    "sessions",
    "skill-preservation.json",
  );

  // In-memory state: sessionID -> SessionState
  const sessionRegistry = new Map<string, SessionState>();

  /**
   * Loads persisted state from disk.
   */
  async function load(): Promise<void> {
    try {
      const content = await fs.readFile(dataPath, "utf-8");
      const data: PersistedState = JSON.parse(content);

      for (const [sessionID, value] of Object.entries(data)) {
        sessionRegistry.set(sessionID, {
          items: new Set(value.items),
          needsReload: value.needsReload,
        });
      }
    } catch {
      // File doesn't exist yet, that's fine
    }
  }

  /**
   * Persists the current state to disk.
   */
  async function save(): Promise<void> {
    const data: PersistedState = {};
    for (const [sessionID, state] of sessionRegistry) {
      // Only persist sessions that have items to preserve
      if (state.items.size > 0) {
        data[sessionID] = {
          items: Array.from(state.items),
          needsReload: state.needsReload,
        };
      }
    }
    try {
      await fs.mkdir(path.dirname(dataPath), { recursive: true });
      await fs.writeFile(dataPath, JSON.stringify(data, null, 2));
    } catch { }
  }

  // Initialize
  await load();

  return {
    // Inject reload instructions into user message flow after compaction
    "experimental.chat.messages.transform": async (input, output) => {
      if (output.messages.length === 0) return;

      const lastMessage = output.messages[output.messages.length - 1];
      const sessionID = lastMessage.info.sessionID;
      const state = sessionRegistry.get(sessionID);

      if (state?.needsReload && state.items.size > 0 && lastMessage.info.role === "user") {
        const skillList = Array.from(state.items).join(", ");

        // Append synthetic part to user message to trigger tool execution
        lastMessage.parts.push({
          id: `skill-reload-${Date.now()}`,
          sessionID,
          messageID: lastMessage.info.id,
          type: "text",
          text: `\n\nLoad the following skills: [${skillList}]`,
          synthetic: true,
        });

        // Reset the flag after injection
        state.needsReload = false;
        await save();
      }
    },

    // Track skill tool usage
    "tool.execute.before": async (input, output) => {
      if (input.tool === "skill" && output.args?.name) {
        let state = sessionRegistry.get(input.sessionID);
        if (!state) {
          state = { items: new Set() };
          sessionRegistry.set(input.sessionID, state);
        }

        state.items.add(output.args.name);
        await save();
      }
    },

    event: async ({ event }) => {
      // Mark session as needing reload after compaction
      if (event.type === "session.compacted") {
        const { sessionID } = event.properties;
        const state = sessionRegistry.get(sessionID);

        if (state && state.items.size > 0) {
          state.needsReload = true;
          await save();
        }
      }
    },
  };
};

export default SkillPreservationPlugin;
