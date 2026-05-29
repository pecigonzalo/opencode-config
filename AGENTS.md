# Directives

- Never work around failures, instead prompt the user
- Never create summaries in files, unless explicitly asked for. Only summarize as a message to the user.
  - Prefer updating existing files like README.md
- Keep documents brief
- When the user asks to plan, refine, review, explore, or propose an approach, do not implement until they explicitly approve implementation.
- Prefer task runners (task, makefile, etc) rather than raw build/test calls
- We use the GNU tool variants to macOS variants replacing the native macOS ones (don't `g<tool>` prefix)
- Prefer `typescript` for ad hoc scripting and structured analysis: HTTP requests, JSON parsing, data extraction, summarization, batching over files, and small programs.
- Prefer `bash` for shell-native operations: `ls`, `find`, `rg`, `grep`, pipes, task runners, and existing CLIs.
- Avoid using `bash` mainly as a wrapper to run inline Python/Node/Ruby scripts when `typescript` can do the job directly.
- Always pipe long outputs (like `go test -v`) to a file and filter its terminal output (like `2>&1 | tee <some-file> | tail -n 20`) for later processing as output can be really long, or alternatively use grep/rg to filter its output
- Only delegate parallel tasks when some of the tasks are read-only. Never delegate more than 1 read-write task as agents run into each other
- Treat delegated agents as having separate context/state unless explicitly confirmed otherwise. Do not assume child agents share the parent todo list.
- When delegating work that requires a skill, pass the skill requirement to the delegated agent instead of loading it in the parent unless the parent also needs it.
- If a delegated task hangs or behaves oddly in parallel, rerun it individually rather than repeating the same parallel batch.
- Until a project reaches 1.0.0 or is otherwise marked as publicly released, code does not need to maintain backward compatibility
- Use behaviour based conventional commits and avoid injecting store or plan references

# Tools

- Prefer `read`/`edit` over shell file operations (`cat`, `sed`, `awk`, `perl -pi`, inline interpreter one-liners).
- Do not prefix shell commands with `cd <current-cwd> &&`; rely on the current working directory unless changing to a different repo/subdirectory is necessary.
- If you are unsure how to do something, use `gh_grep` to search code examples from GitHub
- If you are an orchestrator/universal and need to use `playwright` tools, always delegate to a subagent/task — never invoke them directly
- If LSP is available, prefer LSP operations `findReferences`, `gotoDefinition`, `goToImplementation`, `incomingCalls`, `outgoingCalls` than raw grep/ripgrep
- Never use `playwright` to open local files, read the filesystem, or execute arbitrary scripts — use dedicated file/bash tools instead; `browser_navigate`, `browser_run_code`, and `browser_evaluate` must only target running web servers
