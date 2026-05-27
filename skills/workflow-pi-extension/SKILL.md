---
name: workflow-pi-extension
description: MUST load when creating, modifying, reviewing, debugging, or packaging Pi extensions. Use for custom tools, commands, event hooks, TUI components, providers, extension packages, inter-extension communication, reusable modules, reload behavior, and extension architecture. Routes agents to bundled Pi docs/examples and applies local composability preferences.
metadata:
  role: workflow
  domain: pi-extensions
---

# Pi Extension Workflow

Use this skill as a short workflow and architecture checklist. Do not duplicate
Pi API docs here; read the bundled docs and examples before implementing.

## Required references

Read the relevant Pi docs from the installed Pi package:

- Always read `docs/extensions.md`.
- Read `docs/tui.md` for custom UI, widgets, overlays, renderers, footers, or
  editor components.
- Read `docs/packages.md` for package manifests, dependencies, distribution, or
  install/update behavior.
- Read `docs/custom-provider.md` for model providers, OAuth, or custom
  streaming.
- Read `docs/keybindings.md` for shortcuts or editor key handling.
- Inspect the closest file under `examples/extensions/`.

Prefer official examples over invented patterns.

## Local design preferences

- Prefer composable/reusable extensions over one-off monoliths.
- Prefer extension directories with `package.json` over loose `.ts` files once
  an extension has dependencies, helpers, tests, reusable contracts, or is
  expected to persist.
- Keep extension dependencies self-contained in the extension package.
- Avoid adding extension-specific dependencies to the global Pi package unless
  necessary.
- Factor shared behavior into reusable modules or explicit `pi.events`
  contracts.
- Let one extension own each shared capability, such as notifications, status
  widgets, path protection, configuration, or persistence.
- Prefer optional integration through `pi.events`; prefer imports for hard
  dependencies.
- Namespace shared event names, for example `notifications:show`.
- Export constants and TypeScript types for shared event payloads.
- Keep event payloads JSON-serializable unless there is a strong reason not to.

## Preferred layout

For anything beyond a tiny experiment, prefer:

```text
my-extension/
├── package.json
├── index.ts
├── src/
│   ├── events.ts
│   ├── state.ts
│   └── tools.ts
└── test/
    └── smoke.test.ts
```

Minimal local `package.json`:

```json
{
  "name": "my-pi-extension",
  "private": true,
  "type": "module",
  "dependencies": {},
  "peerDependencies": {
    "@earendil-works/pi-ai": "*",
    "@earendil-works/pi-coding-agent": "*",
    "@earendil-works/pi-tui": "*",
    "typebox": "*"
  },
  "pi": {
    "extensions": ["./index.ts"]
  }
}
```

Use `"keywords": ["pi-package"]` only when publishing or distributing.

## Workflow

1. Identify the extension type: tool, command, event hook, shared service, UI,
   provider, or package.
1. Read the matching Pi docs and closest official example.
1. Check whether an existing extension can be reused or extended.
1. Design shared capabilities as modules or documented `pi.events` contracts.
1. Implement using Pi's documented APIs and TypeScript types.
1. Test with `pi -e ./path`.
1. If persistent, place under `~/.pi/agent/extensions/` or `.pi/extensions/`.
1. Verify `/reload`.

## Safety checklist

- Do not hard-code credentials or log secrets.
- Validate paths and user input.
- Avoid shell interpolation; prefer `pi.exec(command, args)`.
- Check `ctx.hasUI` before requiring interactive UI.
- Use abort signals for long-running work when available.
- Bound custom tool output.
- Use `StringEnum` from `@earendil-works/pi-ai` for tool string enums.
- Throw from tool `execute()` to signal tool failure.
- Use `withFileMutationQueue()` for file-mutating tools.
- Restore state on `session_start`.
- Clean up watchers, intervals, sockets, and child processes on
  `session_shutdown`.
- Treat `ctx.reload()` as terminal: `await ctx.reload(); return;`.

## Final review

Before finishing:

- [ ] Relevant Pi docs were read.
- [ ] Closest official example was inspected.
- [ ] Existing extensions were checked for reuse opportunities.
- [ ] Shared behavior is factored into a reusable module or event contract.
- [ ] Dependencies are local to the extension package.
- [ ] Extension loads with `pi -e`.
- [ ] `/reload` works from an auto-discovered location.
