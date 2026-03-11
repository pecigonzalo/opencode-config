---
name: standards-python
description: MUST load when writing or reviewing Python code; SHOULD load for Python architectural or API design decisions. Provides idiomatic Python patterns, type annotations, error handling, naming conventions, and docstring guidance based on the Google Python Style Guide.
license: MIT
compatibility: opencode
metadata:
  role: standards
  domain: python
  priority: high
---

# Python Standards

**Provides:** Idiomatic Python patterns, type annotations, imports, error handling, naming conventions, docstrings, and resource management. Based on the [Google Python Style Guide](https://google.github.io/styleguide/pyguide.html).

**Primary reference:** Google Python Style Guide.

## Quick Reference

**Golden Rule**: Be consistent. Optimize for readability, not cleverness.

**Do** (✅):

- Run `pylint` and a type checker (`pytype` or `mypy`) on all code
- Use 4-space indentation; never tabs
- Keep lines ≤ 80 characters; use implicit continuation inside `()`, `[]`, `{}`
- Annotate all public APIs with type hints; prefer `X | None` over `Optional[X]`
- Use `"""triple-double-quote"""` for all docstrings
- Use f-strings for string formatting; avoid `+` concatenation in loops
- Use `with` statements for all file/socket/resource management
- Use default iterators (`for key in dict:`) over explicit method calls
- Keep functions focused; aim for ≤ 40 lines
- Guard executables with `if __name__ == '__main__':`

**Don't** (❌):

- Use mutable default arguments (`def f(x=[])`) — use `None` sentinel instead
- Use bare `except:` or catch `Exception`/`BaseException` without re-raising
- Use `assert` for application logic — only for tests or truly optional checks
- Use mutable global state — prefer dependency injection or module constants
- Use `__double_leading_underscore__` dunder names for your own identifiers
- Use `staticmethod` unless forced by an existing API — use module-level functions
- Use `map()`/`filter()` with `lambda` — prefer generator expressions
- Use backslash `\` for line continuation — use implicit joining inside brackets
- Include type names in variable names (`id_to_name_dict`)
- Use `typing.Text`, `typing.List`, `typing.Dict`, etc. in new code — use built-ins

**Key commands:**

```sh
pylint --rcfile=.pylintrc <file>   # lint check
pytype .                           # type check (Google's tool)
mypy .                             # type check (community standard)
black .                            # auto-format (or pyink for Google style)
isort .                            # sort imports
python -m pytest                   # run tests
```

---

## Tooling & Lint

- **pylint**: Run on all code; suppress only with symbolic names and a comment explaining why. Prefer `pylint: disable=<name>` over disabling by ID.
- **Auto-formatter**: Use [Black](https://github.com/psf/black) or [Pyink](https://github.com/google/pyink) to avoid formatting debates. Black is opinionated and largely compatible with this style guide.
- **Type checker**: Use `pytype` (Google) or `mypy`; enable in CI.
- **Import sorting**: Use `isort` with Black-compatible settings.

Keep suppressions rare and always explain them inline.

---

## Imports

- Use `import x` for packages and modules; `from x import y` where `y` is a module.
- Use `from x import y as z` only when `y` is ambiguous, conflicts, or inconveniently long.
- Use `import y as z` only when `z` is a standard abbreviation (`import numpy as np`).
- Always use the full package name — no relative imports.
- Exemptions: `typing`, `collections.abc`, `typing_extensions` — import symbols directly.

Prefer explicit absolute imports; avoid relative imports in shared code.

### Import Order

Group imports from most generic to least generic, separated by blank lines:

1. `from __future__ import ...`
2. Standard library
3. Third-party packages
4. Internal / repository sub-packages

Within each group, sort lexicographically by full package path.

Use stable import grouping: `__future__`, stdlib, third-party, internal.

---

## Formatting

### Line Length

Max 80 characters. Use implicit line continuation inside `()`, `[]`, `{}`. **Never use backslash `\` for continuation** (except inside string literals).

### Indentation

- 4 spaces per level; never tabs.
- Align continuation with the opening delimiter, or use a 4-space hanging indent with nothing on the first line.

### Trailing Commas

Use trailing commas when the closing bracket is on its own line. This signals Black/Pyink to keep items one-per-line.

### Whitespace

- No spaces inside brackets: `spam(ham[1], {'eggs': 2})` not `spam( ham[ 1 ] )`.
- No space before a comma, semicolon, or colon.
- No space before `(` starting an argument list or indexing.
- No trailing whitespace.
- Spaces around `=` for annotated defaults: `def f(x: int = 0)` — but not for unannotated: `def f(x=0)`.
- Do not vertically align tokens across lines.

### Semicolons

Never use semicolons to terminate lines or put two statements on one line.

### Parentheses

Use sparingly. Don't wrap `return` or conditional expressions in unnecessary parentheses.

### Blank Lines

- 2 blank lines between top-level definitions (functions, classes).
- 1 blank line between methods and between a class docstring and the first method.
- No blank line immediately after a `def` line.

---

## Comments & Docstrings

### Docstring Format

Always use `"""triple-double-quotes"""`. The summary line must be ≤ 80 characters and end with a period, `?`, or `!`. If more is needed, follow with a blank line then the body.

### Module Docstrings

Every file should have a license header and a module docstring describing contents and usage.

### Function & Method Docstrings

Required for all public functions. Use sections: `Args`, `Returns`, `Yields` (for generators), `Raises`.
Keep docstring examples concise; prefer one compact example over long narrative samples.

- Use `Yields:` instead of `Returns:` for generator functions.
- Overriding methods may use `"""See base class."""` if behavior is unchanged.

### Class Docstrings

Place below the `class` line. Describe what the class instance represents. Document public attributes in an `Attributes:` section (same format as `Args:`).

### Block & Inline Comments

- Start with `# ` (at least one space after `#`).
- Inline comments: at least 2 spaces from code.
- Comment the *why*, not the *what*. Don't describe what the code obviously does.
- Use proper capitalization and punctuation.

Prefer comments that explain intent/trade-offs, not mechanical behavior.

### TODO Comments

```python
# TODO: crbug.com/192795 - Investigate cpufreq optimizations.
```

Include a bug/issue reference, not a personal name.

---

## Naming

| Type | Public | Internal |
|------|--------|----------|
| Packages | `lower_with_under` | |
| Modules | `lower_with_under` | `_lower_with_under` |
| Classes | `CapWords` | `_CapWords` |
| Exceptions | `CapWords` | |
| Functions/Methods | `lower_with_under()` | `_lower_with_under()` |
| Constants (Global/Class) | `CAPS_WITH_UNDER` | `_CAPS_WITH_UNDER` |
| Global/Class Variables | `lower_with_under` | `_lower_with_under` |
| Instance Variables | `lower_with_under` | `_lower_with_under` (protected) |
| Parameters | `lower_with_under` | |
| Local Variables | `lower_with_under` | |

### Names to Avoid

- Single-character names outside common local conventions
- Dashes in module/package names (use underscores)
- `__double_leading_and_trailing_underscore__` for custom symbols
- Names that encode type (`id_to_name_dict`)

### Naming Conventions

- Use a single leading `_` for internal/protected module attributes, functions, and class members. Avoid `__double_underscore` (name mangling hurts testability).
- File names must use `.py` extension; never use dashes.
- `CapWords` for classes; `lower_with_under.py` for module files.
- Exception names end in `Error` and should not repeat their module: `foo.Error` not `foo.FooError`.

---

## Type Annotations

### General Rules

- Annotate all public APIs (function signatures, class attributes).
- Use `X | None` (3.10+) over `Optional[X]`; always be explicit — no implicit `None` defaults.
- Do not annotate `self` or `cls` (except when using `Self` for return types).
- Use `Any` when a type truly cannot be expressed; prefer `TypeVar` for generic functions.
- Import symbols from `typing` and `collections.abc` directly.

Prefer concise type-hint examples and avoid verbose templates.

### Prefer Abstract Types in Signatures

Accept abstract container types from `collections.abc` in parameters; return concrete types.

### NoneType / Optional

Use explicit `X | None` unions; avoid implicit-optional defaults.

### Type Aliases

Use `TypeAlias` for complex reusable types; name with `CapWords`.

### Generics

Always specify type parameters; never leave generics bare.

### Forward Declarations

Use `from __future__ import annotations` or string literals for forward references.

### Conditional Imports (TYPE_CHECKING)

Use `TYPE_CHECKING` blocks for type-only imports.

### TypeVar Naming

Descriptive names unless the variable is unconstrained and private.

---

## Language Features

### Exceptions

Prefer specific exceptions and small `try` blocks; never silently catch broad exceptions.

- Never use `assert` for application logic — only in tests or as truly optional checks.
- Custom exception names end in `Error`; don't repeat the module name.
- Use `finally` for cleanup regardless of exception outcome.

### Mutable Default Arguments

Never use mutable default arguments; use `None` sentinels or immutable defaults.

### Comprehensions & Generators

Allowed for simple cases. No multiple `for` clauses or complex filter chains. Optimize for readability.

Use comprehensions for simple transforms; switch to explicit loops when readability drops.

### Default Iterators

Prefer default iterators over methods that return lists or explicit key/value access.

### True/False Evaluations

Prefer implicit boolean evaluation. Use `is None` / `is not None` for None checks.

### Strings

- Prefer f-strings for formatting; `%` operator or `.format()` are also acceptable.
- Stay consistent with quote style (`'` or `"`) within a file.
- Use `"""` for multi-line strings; avoid manual `+` concatenation across lines.
- Don't use `+` to build strings in loops — use a list and `''.join()`.

Prefer f-strings and `''.join()` for loop-based string building.

### Logging

Pass a pattern string and arguments separately to loggers — never an f-string as the first argument.

### Files & Resources

Always use `with` statements for files, sockets, and similar resources.

### Properties

Use `@property` for simple attribute access with light computation. Don't use for pure get/set with no logic — make the attribute public instead. Don't use for expensive operations.

### Decorators

Use judiciously. Write unit tests for decorators. Avoid external dependencies (file/network/DB) in decorator code — it runs at import time.

- Avoid `@staticmethod` — use module-level functions instead.
- Use `@classmethod` only for named constructors or class-specific routines.

### Lambda Functions

Acceptable for one-liners. For multi-line or >60–80 char lambdas, use a named nested function. Prefer `operator.mul` over `lambda x, y: x * y`.

### Threading

Don't rely on the atomicity of built-in types. Use `queue.Queue` for inter-thread communication. Use `threading.Condition` over raw locks.

### Power Features

Avoid: custom metaclasses, bytecode access, on-the-fly compilation, `__del__`, heavy `getattr()` reflection, dynamic inheritance. Standard library uses (e.g., `abc.ABCMeta`, `dataclasses`, `enum`) are fine.

### Mutable Global State

Avoid. If necessary, declare at module level with a leading `_` and provide access via functions. Module-level constants are fine and encouraged (`MAX_SIZE = 100`, `_INTERNAL_LIMIT = 50`).

---

## Functions

### Function Length

Aim for ≤ 40 lines. If a function exceeds this, consider decomposing it. Long functions are harder to understand, test, and modify safely.

### Main Guard

Every executable file must guard its main logic:

```python
def main() -> None:
    ...

if __name__ == '__main__':
    main()
```

For absl-based tools:

```python
from absl import app

def main(argv: Sequence[str]) -> None:
    ...

if __name__ == '__main__':
    app.run(main)
```

### Getters & Setters

Use getter/setter functions only when getting or setting involves meaningful computation or side effects. For simple attribute access, use a public attribute or `@property` instead.

Follow naming: `get_foo()`, `set_foo()` — or `@property` for simple computed attributes.

---

## Checklist

### When Writing Code

- [ ] All public functions/methods have docstrings with `Args`/`Returns`/`Raises`
- [ ] Type annotations on all public APIs; explicit `X | None` for optional types
- [ ] No mutable default arguments
- [ ] No bare `except:` or silent `except Exception`
- [ ] Resources managed with `with` statements
- [ ] No `+` string concatenation in loops
- [ ] Imports ordered: `__future__` → stdlib → third-party → internal
- [ ] No relative imports
- [ ] `if __name__ == '__main__':` guard on executables
- [ ] Logging uses `%` pattern strings, not f-strings

### When Reviewing Code

- [ ] Naming follows conventions (snake_case functions/vars, CapWords classes, CAPS_WITH_UNDER constants)
- [ ] No type names encoded in variable names
- [ ] Functions ≤ ~40 lines; focused and testable
- [ ] No mutable global state (constants are fine)
- [ ] No `staticmethod` without compelling reason
- [ ] Type annotations are specific (no bare `Sequence` without type parameter)
- [ ] Exception classes end in `Error`; no `assert` for application logic

## Skill Loading Triggers

| Situation | Also load |
|---|---|
| Writing or reviewing Python tests | `standards-testing` |
| Auth, secrets, user input, crypto | `standards-security` |
| Implementing features/fixes (TDD) | `role-developer` |
| Python API/package/service design | `role-architect` |
| Python PR review | `role-code-review` |
