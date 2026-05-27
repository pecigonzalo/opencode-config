---
name: standards-skill-authoring
description: MUST load when creating, modifying, reviewing, or evaluating AI Agent Skills/SKILL.md files; SHOULD load when optimizing skill descriptions, designing skill evals, packaging skills, or converting a repeated workflow into a reusable skill. Provides Agent Skills spec rules, Pi/OpenCode compatibility guidance, progressive-disclosure structure, authoring workflow, validation checklist, and cross-client portability notes.
license: MIT
compatibility: pi, opencode, and Agent Skills-compatible clients
metadata:
  role: standards
  domain: skill-authoring
---

# Skill Authoring Standards

Use this skill to create, improve, review, or evaluate AI Agent Skills. A good
skill captures reusable expertise that an agent would otherwise need to
rediscover or be reminded of repeatedly.

## Quick reference

- Create skills for repeatable workflows, domain expertise, fragile procedures,
  or task-specific tools and resources.
- Keep `SKILL.md` focused; move conditional detail to `references/`.
- Put trigger guidance in `description`; the body loads only after activation.
- Prefer the strict portable subset unless the user targets one client.
- Include concrete examples, gotchas, validation loops, and safe defaults.
- Avoid generic advice the model already knows.
- Test with realistic prompts before declaring the skill done.

## When to create a skill

Create a skill when the user needs:

- A repeated multi-step workflow.
- Domain-specific knowledge, schemas, APIs, policies, or conventions.
- A fragile sequence where order matters.
- Bundled scripts, references, templates, or assets.
- Instructions too long or conditional for always-on context files.

Do not create a skill when:

- The instruction should always apply; use project/user instructions instead.
- The task is a one-off answer or simple preference.
- The content is generic best practice with no non-obvious procedure.
- Another existing skill already covers the workflow.

## Portable structure

Use this baseline for skills that should work across Pi, OpenCode, Codex,
Claude Code, Gemini CLI, VS Code, GitHub Copilot, and Goose:

```text
skill-name/
└── SKILL.md
```

Optional resources:

```text
skill-name/
├── SKILL.md
├── scripts/
├── references/
└── assets/
```

Use resource directories intentionally:

- `scripts/`: deterministic or repeated logic the agent should execute.
- `references/`: detailed docs loaded only when relevant.
- `assets/`: templates or files used to produce outputs.

Do not add auxiliary docs such as `README.md`, `CHANGELOG.md`,
`INSTALLATION_GUIDE.md`, or `QUICK_REFERENCE.md` unless the user asks. A skill
package should contain only what helps another agent do the task.

## Frontmatter

Use this portable baseline:

```yaml
---
name: skill-name
description: Clear description of what the skill does and when to use it.
---
```

Recommended optional fields for Pi/OpenCode-compatible skills:

```yaml
license: MIT
compatibility: pi, opencode, and Agent Skills-compatible clients
metadata:
  role: standards
  domain: example-domain
```

Name rules:

- Use lowercase letters, digits, and hyphens only.
- Keep names under 64 characters.
- Do not start or end with a hyphen.
- Do not use consecutive hyphens.
- Prefer matching the directory name, even when a client is lenient.
- Prefer short verb-led or domain-led names.

Good names: `code-review`, `gh-address-comments`,
`standards-skill-authoring`, `terraform-module-review`.

Bad names: `CodeReview`, `-code-review`, `code--review`,
`company/internal/review`.

## Description writing

The `description` field is the primary trigger mechanism. Write it as an
instruction to the agent, not as marketing copy.

A good description includes:

1. What the skill helps with.
1. When to use it.
1. Adjacent tasks that should also trigger it.
1. Boundaries when false positives are likely.

Prefer pushy but precise wording:

```yaml
description: MUST load when creating, modifying, reviewing, or evaluating AI Agent Skills/SKILL.md files; SHOULD load when optimizing skill descriptions, designing skill evals, packaging skills, or converting a repeated workflow into a reusable skill. Provides Agent Skills spec rules, compatibility guidance, progressive-disclosure structure, authoring workflow, and validation checklist.
```

Avoid vague descriptions:

```yaml
description: Helps write skills.
```

Keep all trigger information in the description. A body section named
"When to use this skill" is less useful because the agent will not see it until
after the skill has already triggered.

## Authoring workflow

### 1. Capture intent

Start from concrete use cases. Ask only the highest-value questions first:

- What should this skill enable the agent to do?
- What user prompts should trigger it?
- What output should the agent produce?
- What corrections has the user repeated before?
- Does the task need scripts, references, or assets?

If extracting a skill from an existing conversation, use the conversation as
source material before asking for more details. Look for steps that worked,
user corrections, input/output formats, tools, commands, APIs, file paths,
gotchas, and verification steps.

### 2. Choose the scope

Make the skill a coherent unit of work.

Good scope:

- `github-pr-review`: review PRs using a team's checklist.
- `billing-query-analysis`: answer billing questions using known schemas.
- `run-local-app`: launch and verify this project locally.

Too narrow: `check-one-header`, `run-one-command`.
Too broad: `engineering`, `all-company-workflows`, `everything-about-cloud`.

If one task requires many unrelated procedures, split it into multiple skills.

### 3. Plan resources

Before writing, decide what belongs in `SKILL.md` versus supporting files.

Keep in `SKILL.md`:

- Core workflow.
- Critical gotchas.
- Resource map.
- Short examples.
- Validation checklist.

Move to `references/`:

- Long API docs.
- Detailed schemas.
- Large policy documents.
- Framework-specific variants.
- Troubleshooting catalogs.

Move to `scripts/`:

- Repeated parsing, conversion, validation, or generation.
- Fragile shell sequences.
- Checks that need deterministic pass/fail output.

Move to `assets/`:

- Templates.
- Boilerplate projects.
- Example files used as output inputs.
- Images, fonts, or configuration skeletons.

### 4. Write instructions

Use imperative, task-oriented instructions.

Good:

```markdown
1. Inspect the repository's existing release format.
1. Draft release notes from merged PRs.
1. Propose a semantic version bump with reasoning.
1. Provide a copy-pasteable `gh release create` command.
```

Weak:

```markdown
You are an expert release manager. Be careful and follow best practices.
```

Explain why when it improves judgment:

```markdown
Prefer reading the existing changelog before drafting new notes because this
keeps tone, section ordering, and version terminology consistent.
```

### 5. Add examples and gotchas

Use examples when they reduce ambiguity:

```markdown
Input: Added JWT login and logout endpoints.
Output: `feat(auth): add JWT login and logout`

Input: Fixed retry handling for GitHub API rate limits.
Output: `fix(github): retry rate-limited API calls`
```

Gotchas correct likely model assumptions:

```markdown
- The `users` table uses soft deletes. Queries must include
  `deleted_at IS NULL`.
- The health endpoint only checks the web process. Use `/ready` for database
  readiness.
- The release branch is `stable`, not `main`.
```

Add a gotcha whenever the user has to correct the agent.

### 6. Add validation

Every skill should tell the agent how to know it is done.

```markdown
## Validation

Before finishing:

- Run `npm test` if package files changed.
- Check generated JSON with `jq`.
- Confirm all required fields are present.
- Report final file paths and any skipped checks.
```

For destructive or fragile tasks, use plan-validate-execute:

1. Draft the plan.
1. Validate it against the source of truth.
1. Show the user what will change.
1. Execute only after approval.
1. Verify the result.

## Progressive disclosure

Design skills so the agent loads only what it needs.

Rules:

- Keep `SKILL.md` under 500 lines when possible.
- Keep reference files focused and directly linked from `SKILL.md`.
- Tell the agent when to read each reference.
- Avoid deeply nested reference chains.
- Do not duplicate the same information in both `SKILL.md` and references.

Good resource map:

```markdown
## Resource map

- Read `references/aws.md` only for AWS deployments.
- Read `references/gcp.md` only for GCP deployments.
- Run `scripts/validate-config.sh` after editing deployment config.
```

Weak resource map:

```markdown
See references for more information.
```

## Scripts in skills

Use scripts when repeated code or deterministic validation would save time or
reduce errors.

Script guidelines:

- Accept input through flags, files, environment variables, or stdin.
- Do not prompt interactively.
- Provide `--help`.
- Print machine-readable output when possible.
- Send structured data to stdout and diagnostics to stderr.
- Use safe defaults.
- Support `--dry-run` for destructive operations.
- Return meaningful exit codes.

Pin dependencies when practical. Prefer self-contained scripts for portability.

Example instruction:

```markdown
Run `bash scripts/validate.sh path/to/config.json` before finalizing. If
validation fails, fix the reported issue and run it again.
```

## Cross-client compatibility

Prefer the strict portable subset unless the user targets a specific client.

Portable baseline:

- Directory containing `SKILL.md`.
- Required frontmatter: `name`, `description`.
- Optional frontmatter: `license`, `compatibility`, `metadata`.
- Relative links to `scripts/`, `references/`, and `assets/`.

Avoid relying on client-specific fields unless requested.

### Pi notes

Pi loads skills from `~/.pi/agent/skills/`, `~/.agents/skills/`, `.pi/skills/`,
`.agents/skills/`, package skill directories, settings paths, and explicit
`--skill` paths. Pi supports `/skill:name` commands. Pi is lenient about some
validation issues, including name and directory mismatches, but portable skills
should still keep names strict and matching.

### OpenCode notes

OpenCode is stricter: `name` must match the skill directory, unknown
frontmatter fields are ignored, and skills can be hidden or gated by
permissions. Write OpenCode-compatible skills using the strict baseline.

### Codex notes

Codex emphasizes context discipline: add only information another agent would
not already know, avoid auxiliary docs, put trigger logic in `description`, and
use bundled scripts when agents repeatedly rewrite the same code. Some Codex
skills include `agents/openai.yaml` for UI metadata; treat that as
Codex-specific.

### Claude Code notes

Claude Code supports extra fields and features such as
`disable-model-invocation`, `allowed-tools`, `context: fork`, `agent`,
`argument-hint`, `arguments`, dynamic shell injection, and
`${CLAUDE_SKILL_DIR}`. Use these only when targeting Claude Code.

### Gemini CLI notes

Gemini discovers built-in, extension, user, and workspace skills. It supports
`.agents/skills/` as a compatibility alias. Skill activation may ask for user
consent and grant the skill directory as an allowed path.

### VS Code and GitHub Copilot notes

Use skills for on-demand specialized workflows and resources. Use custom
instructions for always-on coding standards and preferences. Invalid names may
fail to load silently, so follow strict name rules.

### Goose notes

Goose recommends `.agents/skills/` for shared compatibility. Keep skills
focused, direct, and verification-oriented.

## Review checklist

When reviewing a skill, check:

- `SKILL.md` exists.
- Frontmatter is valid YAML.
- `name` and `description` are present.
- Name follows strict rules and matches the directory.
- Description says what the skill does and when to use it.
- Description includes adjacent phrasing users might use.
- Description stays under 1024 characters.
- Trigger guidance is not hidden only in the body.
- Instructions are concise and imperative.
- Generic advice is removed.
- Gotchas capture non-obvious mistakes.
- Examples are realistic.
- Validation steps are present.
- Supporting files are necessary and referenced.
- Scripts are non-interactive and documented.
- Destructive actions require confirmation or dry-run.
- Secrets are not requested in chat.
- Skill behavior matches the user's intent.

## Testing a skill

Use lightweight manual tests first. Create 2 or 3 realistic prompts:

```json
[
  {
    "prompt": "Turn our release checklist into a reusable skill for this repo.",
    "should_trigger": true
  },
  {
    "prompt": "Review this SKILL.md and tell me if it will load in OpenCode.",
    "should_trigger": true
  },
  {
    "prompt": "Add a README section for installation.",
    "should_trigger": false
  }
]
```

For output quality, compare with the skill, without the skill, and with the
previous version if editing an existing skill.

Check whether the skill triggered when it should, avoided near misses, improved
behavior, avoided wasted context, and caught real issues with validation.

When using subagents for forward-testing, avoid leaking expected answers. Pass
the skill and raw task artifacts, not your conclusions.

Good forward-test prompt:

```text
Use the skill at /path/to/skill-name to complete this task:
<realistic user request>
```

Weak forward-test prompt:

```text
Review this skill and confirm it fixes the bug where agents forget step 3.
```

## Description optimization

If the skill triggers too rarely or too often, improve the description.

Create should-trigger and should-not-trigger prompts. Strong should-trigger
prompts use realistic file paths, user context, casual phrasing, cases where the
user does not name the skill directly, and tasks embedded in larger requests.

Strong should-not-trigger prompts are near misses: they share keywords with the
skill but require a different workflow. Avoid obvious negatives such as weather
or Fibonacci prompts.

Revise the description by generalizing from failures. Do not overfit to exact
phrases from the eval set.

## Final checklist

Before handing back a skill:

- [ ] The skill has a clear reusable purpose.
- [ ] `name` is strict lowercase hyphen-case.
- [ ] Directory name matches `name`.
- [ ] `description` is specific, trigger-oriented, and under 1024 characters.
- [ ] Frontmatter uses portable fields unless client-specific behavior is needed.
- [ ] `SKILL.md` is concise and focused.
- [ ] Supporting files are necessary and referenced.
- [ ] Scripts are non-interactive and documented.
- [ ] Gotchas and validation steps are included.
- [ ] The skill has been tested with realistic prompts or reviewed against them.
- [ ] Client-specific compatibility assumptions are documented.

## See also

- Agent Skills specification: `https://agentskills.io/specification`
- Agent Skills best practices: `https://agentskills.io/skill-creation/best-practices`
- Pi skills documentation: `docs/skills.md` in the Pi coding-agent package
- OpenCode skills documentation: `https://opencode.ai/docs/skills/`
