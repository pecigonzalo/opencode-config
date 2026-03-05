# Directives

- Never created summaries in files, unless explicitly asked for. Only summarize as a message to the user.
  - Prefer updating existing files like README.md
- Keep documents brief
- Prefer to use tools other than `bash` for exploration and editing
- Prefer task runners (task, makefile, etc) than raw build/test calls
- Prefer GNU tool variants to macOS variantls
- Always pipe long outputs (like `go test -v`) to a file and filter its terminal output (like `2>&1 | tee <some-file> | tail -n 20`) for later processing as output can be really long, or alternatively use grep/rg to filter its output
- Only delegate parallel tasks when some of the task are read-only. Never delegate more than 1 read-write task as agents run into each other

# Tools

- If you are unsure how to do something, use `gh_grep` to search code examples from GitHub
- If you are an orchestrator/universal and trying to use `playwright` tools, delegate this to an agent/task
- If LSP is available, prefer LSP operations `findReferences`, `gotoDefinition`, `goToImplementation`, `incomingCalls`, `outgoingCalls` than raw grep/ripgrep
