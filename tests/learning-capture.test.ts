import { describe, test, expect } from "bun:test";
import {
  extractUserMessages,
  pickLatestSession,
  formatDraftMarkdown,
  LearningCapturePlugin,
} from "../plugins/learning-capture";
import type {
  Message,
  Part,
  Session,
  TextPart,
} from "@opencode-ai/sdk/dist/gen/types.gen";

/**
 * Helper to create a minimal UserMessage for testing.
 */
function makeUserMessage(
  id: string,
  createdAt: number,
): Message {
  return {
    id,
    sessionID: "sess-1",
    role: "user",
    time: { created: createdAt },
    agent: "universal",
    model: { providerID: "test", modelID: "test" },
  };
}

/**
 * Helper to create an AssistantMessage for testing.
 */
function makeAssistantMessage(
  id: string,
  createdAt: number,
): Message {
  return {
    id,
    sessionID: "sess-1",
    role: "assistant",
    time: { created: createdAt },
    parentID: "parent-1",
    modelID: "test",
    providerID: "test",
    mode: "default",
    path: { cwd: "/tmp", root: "/tmp" },
    cost: 0,
    tokens: {
      input: 0,
      output: 0,
      reasoning: 0,
      cache: { read: 0, write: 0 },
    },
  };
}

/**
 * Helper to create a TextPart.
 */
function makeTextPart(
  text: string,
  messageID: string,
): TextPart {
  return {
    id: `part-${Math.random().toString(36).slice(2)}`,
    sessionID: "sess-1",
    messageID,
    type: "text",
    text,
  };
}

/**
 * Helper to create a minimal Session.
 */
function makeSession(
  id: string,
  title: string,
  updated: number,
): Session {
  return {
    id,
    projectID: "proj-1",
    directory: "/tmp",
    title,
    version: "1",
    time: { created: 1000, updated },
  };
}

describe("extractUserMessages", () => {
  test("extracts a user message with one TextPart", () => {
    const messages = [
      {
        info: makeUserMessage("msg-1", 1000),
        parts: [makeTextPart("Hello agent", "msg-1")] as Part[],
      },
    ];

    const result = extractUserMessages(messages);

    expect(result).toHaveLength(1);
    expect(result[0].messageID).toBe("msg-1");
    expect(result[0].createdAt).toBe(1000);
    expect(result[0].text).toBe("Hello agent");
  });

  test("joins multiple TextParts with newline", () => {
    const messages = [
      {
        info: makeUserMessage("msg-2", 2000),
        parts: [
          makeTextPart("First part", "msg-2"),
          makeTextPart("Second part", "msg-2"),
        ] as Part[],
      },
    ];

    const result = extractUserMessages(messages);

    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("First part\nSecond part");
  });

  test("excludes assistant messages", () => {
    const messages = [
      {
        info: makeAssistantMessage("msg-a", 1000),
        parts: [makeTextPart("I am an assistant", "msg-a")] as Part[],
      },
      {
        info: makeUserMessage("msg-u", 2000),
        parts: [makeTextPart("I am the user", "msg-u")] as Part[],
      },
    ];

    const result = extractUserMessages(messages);

    expect(result).toHaveLength(1);
    expect(result[0].messageID).toBe("msg-u");
  });

  test("filters out messages with no TextParts", () => {
    const toolPart: Part = {
      id: "tool-1",
      sessionID: "sess-1",
      messageID: "msg-3",
      type: "tool",
      callID: "call-1",
      tool: "bash",
      state: {
        status: "completed",
        input: {},
        output: "done",
        title: "bash",
        metadata: {},
        time: { start: 1000, end: 2000 },
      },
    };

    const messages = [
      {
        info: makeUserMessage("msg-3", 3000),
        parts: [toolPart],
      },
    ];

    const result = extractUserMessages(messages);
    expect(result).toHaveLength(0);
  });

  test("filters out user messages with empty text", () => {
    const messages = [
      {
        info: makeUserMessage("msg-4", 4000),
        parts: [makeTextPart("   ", "msg-4")] as Part[],
      },
    ];

    const result = extractUserMessages(messages);
    expect(result).toHaveLength(0);
  });
});

describe("pickLatestSession", () => {
  test("returns the session with the largest time.updated", () => {
    const sessions = [
      makeSession("s-1", "Old", 1000),
      makeSession("s-3", "Newest", 3000),
      makeSession("s-2", "Middle", 2000),
    ];

    const result = pickLatestSession(sessions);

    expect(result).toBeDefined();
    expect(result!.id).toBe("s-3");
    expect(result!.title).toBe("Newest");
  });

  test("returns undefined for empty array", () => {
    const result = pickLatestSession([]);
    expect(result).toBeUndefined();
  });

  test("returns the only session when array has one element", () => {
    const sessions = [makeSession("s-only", "Only", 5000)];
    const result = pickLatestSession(sessions);

    expect(result).toBeDefined();
    expect(result!.id).toBe("s-only");
  });
});

describe("formatDraftMarkdown", () => {
  const globalLearning = {
    action: "add" as const,
    target: "global" as const,
    heading: "Directives",
    directive: "Always prefer concise responses",
    rationale: "User consistently asked for shorter answers",
    evidence: ["Keep it brief", "Too long, summarize"],
  };

  const localLearning = {
    action: "update" as const,
    target: "local" as const,
    heading: "Tools",
    directive: "Use ripgrep instead of grep",
    existingText: "Use grep for searching",
    rationale: "User corrected to use rg",
    evidence: ["Don't use grep, use rg"],
  };

  const deleteLearning = {
    action: "delete" as const,
    target: "local" as const,
    heading: "Directives",
    directive: "Removed obsolete directive",
    rationale: "No longer applicable",
    evidence: ["Stop doing that"],
  };

  test("includes Global AGENTS.md changes section for global learnings", () => {
    const result = formatDraftMarkdown(
      { learnings: [globalLearning] },
      "Test Session",
      "sess-123",
    );

    expect(result).toContain("### Global AGENTS.md changes");
    expect(result).toContain("**[ADD]** `Directives`");
    expect(result).toContain("> Always prefer concise responses");
  });

  test("includes Local AGENTS.md changes section for local learnings", () => {
    const result = formatDraftMarkdown(
      { learnings: [localLearning] },
      "Test Session",
      "sess-123",
    );

    expect(result).toContain("### Local AGENTS.md changes");
    expect(result).toContain("**[UPDATE]** `Tools`");
    expect(result).toContain("> Use ripgrep instead of grep");
  });

  test("formats ADD, UPDATE, DELETE correctly", () => {
    const result = formatDraftMarkdown(
      { learnings: [globalLearning, localLearning, deleteLearning] },
      "Test Session",
      "sess-123",
    );

    expect(result).toContain("**[ADD]**");
    expect(result).toContain("**[UPDATE]**");
    expect(result).toContain("**[DELETE]**");
  });

  test("includes session title and ID", () => {
    const result = formatDraftMarkdown(
      { learnings: [globalLearning] },
      "My Session",
      "sess-456",
    );

    expect(result).toContain(
      '_Analyzed session: "My Session" (ID: sess-456)_',
    );
  });

  test("includes rationale and evidence", () => {
    const result = formatDraftMarkdown(
      { learnings: [globalLearning] },
      "Test",
      "sess-1",
    );

    expect(result).toContain(
      "_Rationale: User consistently asked for shorter answers_",
    );
    expect(result).toContain('"Keep it brief"');
    expect(result).toContain('"Too long, summarize"');
  });

  test("shows fallback message when no learnings found", () => {
    const result = formatDraftMarkdown(
      { learnings: [] },
      "Empty",
      "sess-empty",
    );

    expect(result).toContain("No learnings identified from this session.");
    expect(result).toContain("sess-empty");
  });

  test("shows both sections when both global and local learnings exist", () => {
    const result = formatDraftMarkdown(
      { learnings: [globalLearning, localLearning] },
      "Mixed",
      "sess-mix",
    );

    expect(result).toContain("### Global AGENTS.md changes");
    expect(result).toContain("### Local AGENTS.md changes");
  });
});

describe("plugin tool structure", () => {
  test("exported plugin function returns tool definition", async () => {
    const mockCtx = {
      client: {} as any,
      project: {} as any,
      directory: "/tmp",
      worktree: "/tmp",
      serverUrl: new URL("http://localhost:3000"),
      $: {} as any,
    };

    const hooks = await LearningCapturePlugin(mockCtx);

    expect(hooks.tool).toBeDefined();
    expect(hooks.tool!["learning_review_session"]).toBeDefined();
    expect(hooks.tool!["learning_review_session"].description).toContain(
      "Analyze a session transcript",
    );
    expect(hooks.tool!["learning_review_session"].execute).toBeInstanceOf(
      Function,
    );
  });
});
