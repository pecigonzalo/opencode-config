# OpenCode Configuration Repository - Engineering Standards

This document defines standards for AI agents working within the **OpenCode configuration repository** (`~/.config/opencode`). This is NOT a standard application repository—it's the meta-repository that defines how OpenCode agents behave.

## 1. Repository Structure

This repository contains:
- **`agents/`**: Agent definitions (universal, planner, fast, balanced, deep, deep-l, thinker, explorer)
- **Skill modules**: Domain-specific skill capabilities loaded on-demand by agents
- **`tools/`**: Custom TypeScript tools extending OpenCode's capabilities
- **`tools/gitro`**: fallback read-only git tool — only use when `bash` is not available (e.g. in read-only agents like `explorer`); prefer `bash git ...` in implementation agents
- **`plugins/`**: OpenCode plugins for system-level integrations
- **`opencode.jsonc`**: Primary configuration file (agent models, permissions, settings)
- **`.opencode/sessions/`**: Runtime data (store.json for persistent memory)

## 2. Development Workflow

### Build & Runtime
This repository uses **Bun** for custom tools and plugins:
- **Runtime**: Bun (declared globally in all `.ts` files)
- **Build tools**: `bun build` (compiles TypeScript to `dist/`)
- **No package.json scripts**: Use Bun directly or OpenCode's built-in commands

### Testing Custom Tools
When developing custom tools (in `tools/` or `plugins/`):
- **Test framework**: Bun's built-in test runner
- **Run tests**: `bun test`
- **Single test**: `bun test <file_path>`
  - *Example*: `bun test tests/storeread.test.ts`
- **Pattern**: Follow **AAA** (Arrange-Act-Assert)
  - **Arrange**: Set up test data and mocks
  - **Act**: Execute the tool function
  - **Assert**: Verify results and side effects
- **Coverage**: 100% for store/plugin tools (critical system components)

---

## 2. Code Style Guidelines

### Language & Architecture
- **TypeScript**: Strict type checking is enabled. Never use `@ts-ignore` without a critical reason.
- **Dependency Injection**: Use DI to ensure components are testable and decoupled.
  - *Pattern*: Pass dependencies as arguments or constructor parameters rather than importing singletons directly.
- **Functional Programming**:
  - Prefer pure functions over methods where possible.
  - Maintain immutability; avoid mutating arguments.
  - Use composition to build complex behavior from simple parts.

### Formatting
- **Indentation**: 2 spaces.
- **Quotes**: Double quotes (`"`) for strings.
- **Semicolons**: Always include semicolons.
- **File Names**: Use `kebab-case.ts` (e.g., `user-service.ts`).
- **Variables/Functions**: Use `camelCase` (e.g., `calculateTotal`).
- **Constants**: Use `UPPER_SNAKE_CASE` (e.g., `MAX_RETRIES`).

### Imports
- **Grouping**: Group imports in the following order:
  1. Built-in modules (e.g., `fs`, `path`).
  2. External dependencies (e.g., `npm` packages).
  3. Internal modules (using relative paths).
- **Sorting**: Sort alphabetically within each group.
- **Pattern**: Prefer named imports over default imports for better grep-ability and tree-shaking.

### Type Safety
- **Explicit Returns**: Always define explicit return types for functions.
- **Avoid `any`**: Use `unknown` if a type is truly dynamic, then narrow it.
- **Interfaces**: Define `interface` for object shapes; use `type` for unions or aliases.

### Naming Conventions
- **Functions**: Use verb-based names (e.g., `getUserById`, `calculateTotal`).
- **Booleans**: Use prefixes like `is`, `has`, or `should` (e.g., `isActive`, `hasPermission`).
- **Complexity**: Keep functions focused. If a function exceeds 50 lines, refactor it.

---

## 3. Error Handling

We prefer explicit error handling over exceptions for expected failure states.

### Result Pattern
Functions that can fail should return a Result object:
```typescript
type Result<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
};
```

### Guidelines
- **Expected Failures**: Return a `{ success: false, error: "..." }` object.
- **Unexpected Failures**: Use `try-catch` only for truly exceptional cases (e.g., network failure, disk I/O errors).
- **Graceful Degradation**: Ensure the system remains stable even when a specific tool or agent fails.

---

## 4. System Architecture

### Multi-Agent Orchestration
This system operates as a multi-agent environment where specialized agents collaborate on tasks.
- **Agent Definitions**: Found in `agents/`. These define the "personality" and high-level instructions for specific roles.
- **Skills**: Shared capabilities are loaded from skill modules. Each skill contains domain-specific instructions and reference scripts.

### Persistence & Memory
- **Store System**: Persistent memory is managed via `.opencode/sessions/store.json`.
- **Durable Memories**: Use `storewrite` to persist architectural decisions, schemas, and critical context.
- **TODO-Store Linking**: When referencing a stored item in comments or TODOs, use the `[store:id]` syntax to maintain traceability between code and decisions.

---

## 5. Reference Guidelines

For deeper dives into specific standards, refer to the following skill definitions:

- **Code Quality** (`skill:standards-code`): Detailed patterns for writing clean, maintainable TypeScript.
- **Testing Practices** (`skill:standards-testing`): Comprehensive guide on unit, integration, and E2E testing.
- **Security Guidelines** (`skill:standards-security`): OWASP Top 10 mitigations and secure coding checklists.
- **Orchestration Patterns** (`agents/universal.md`): Documentation on how agents should coordinate on complex tasks.

---

## 6. Interaction Protocol

When acting as an agent in this repository, follow these steps:
1. **Analyze**: Before writing code, use `Read` or `Grep` to understand existing patterns and the local context.
2. **Plan**: Decompose complex tasks using the `pattern-task-breakdown` skill to create a clear execution roadmap.
3. **Execute**: Implement changes while adhering strictly to the code style and architectural guidelines.
4. **Verify**: Run `bun test` before considering a task complete. Ensure 100% coverage for new logic.
5. **Document**: Update relevant documentation (like this file or API docs) if you change public APIs or system behavior.
6. **Commit**: Create concise, descriptive commits that explain the "why" behind the changes.

---

## 7. Commit & Pull Request Standards

- **Atomic Commits**: Keep commits small and focused on a single change.
- **Message Format**: Use imperative mood (e.g., "Add user authentication" instead of "Added user authentication").
- **PR Summaries**: Provide a clear summary of changes, including any breaking changes or new dependencies.

---

*Note: This file is a living document. Updates to these standards should be reflected here to ensure all agents remain aligned.*
