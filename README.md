# README

This repository contains the OpenCode configuration that wires agent prompts,
custom skills, tools, and plugins needed by the orchestrator.

## Structure
- `opencode.jsonc` — the main configuration reference for agents and plugins
- `AGENTS.md` — global directives that guide every agent
- `agents/` — prompt definitions scoped to each agent role
- `skills/` — reusable skill files loaded by agents on demand
- `tools/` — custom scripts available to the agents
- `plugins/` — OpenCode plugins that extend agent capabilities

## Migration note
This configuration is intended to migrate into [dotFiles](https://github.com/pecigonzalo/dotFiles)
in the future.
