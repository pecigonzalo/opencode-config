---
name: standards-typescript
description: MUST load when writing or reviewing TypeScript; SHOULD load for TS API design. Provides idiomatic patterns, type system, naming, and Google TS Style Guide rules.
license: MIT
compatibility: opencode
metadata:
  role: standards
  domain: typescript
  priority: high
---

# TypeScript Standards

**Provides:** Idiomatic TypeScript patterns, type system usage, imports/exports, naming conventions, JSDoc rules, formatting, and high-signal disallowed features. Based on the [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html).

**Primary references:** Google TS Style Guide and TS Handbook.

## Quick Reference

**Golden Rule**: Prefer type inference; use explicit annotations at boundaries and wherever the type is non-obvious

**Style principles (priority order):**

| Principle       | Key question                                     |
| --------------- | ------------------------------------------------ |
| Correctness     | Does the type system catch bugs at compile time? |
| Clarity         | Can a reader understand the intent?              |
| Simplicity      | Is this the simplest type-safe approach?         |
| Consistency     | Does this match surrounding code?                |

**Do** (✅):

- `const` by default; `let` if reassigned; never `var`
- Named exports only; no default exports
- `import type {Foo}` for type-only imports
- `unknown` over `any`; narrow explicitly with type guards
- `private` keyword for private class members (not `#private`)
- `readonly` on non-reassigned properties
- `===` / `!==`; exception: `== null` checks both null+undefined
- `as Foo` for type assertions (not `<Foo>`)
- `throw new Error(...)` only; never throw strings/literals
- `catch (e: unknown)` and assert `e instanceof Error` before use
- `interface` for structural types; avoid `class` for pure data shapes
- Treat acronyms as words: `loadHttpUrl` not `loadHTTPURL`

**Don't** (❌):

- `var`, `new Array()`, `new Object()`
- Default exports
- `export let` (mutable named exports)
- `#private` fields
- `any` (prefer `unknown`)
- `const enum`
- `with`, `eval`, `Function(...string)`
- Wrapper object instantiation (`new String()`, `new Boolean()`, `new Number()`)
- `debugger` in production
- `parseInt`/`parseFloat` without radix validation — use `Number()` + `isNaN`
- Unary `+` for string-to-number coercion

**Key commands:**

```sh
npx tsc --noEmit           # type-check without emitting
npx eslint --ext .ts .     # lint TypeScript files
npx prettier --check .     # check formatting
npx prettier --write .     # auto-format
```

**Recommended `tsconfig` flags:** `strict`, `noUncheckedIndexedAccess`.

---

## Source File Structure

File order (blank line between each section):

1. Copyright/license comment (if applicable)
2. `@fileoverview` JSDoc (if applicable)
3. Imports
4. Implementation

- UTF-8 encoding; use actual Unicode characters — not escape sequences — for printable chars (e.g., `const pi = 'π'`, not `'\u03C0'`).

Keep file structure simple and consistent; avoid boilerplate comments/examples unless they add non-obvious value.

---

## Imports & Exports

### Imports

- Use ES module `import`/`export`; **never** `require()`, CommonJS patterns, `namespace`, or `/// <reference>`.
- **Named imports** for frequently used symbols; **namespace imports** (`import * as foo`) for large APIs where many symbols are used.
- **Relative paths** for project-internal code (`./foo`, `../bar`); module paths for packages.
- `import type {Foo}` for type-only imports — erased at compile time, avoids circular deps.

Prefer concise imports: named by default, namespace for large APIs, and `import type` for type-only symbols.

### Exports

- **Named exports only** — no default exports.
- `export const` not `export let` (mutable named exports are banned).
- `export type {Foo}` for type re-exports.
- No container classes with only static methods — use module-level named exports instead.

Named exports only. Avoid default exports, mutable exports, and static-only container classes.

---

## Variables

- `const` by default; `let` if the binding is reassigned; **never `var`**.
- One declaration per line.
- No use before declaration.

Keep declarations simple: `const` by default, `let` when reassigned, never `var`.

---

## Arrays & Objects

- Never `new Array()` / `new Object()` — use literals (`[]`, `{}`).
- Prefer spread for shallow copy/merge.
- Use `for...of` for arrays.
- Use `Object.keys/values/entries` for object iteration.

---

---

## Classes

- Use TypeScript `private` keyword — **no `#private` fields**.
- Mark non-reassigned properties `readonly`.
- Use parameter properties: `constructor(private readonly svc: UserService) {}`.
- Initialize fields at declaration, not in the constructor body.
- Getters must be pure — no side effects, no observable state changes.
- **Never** use the `public` modifier unless it's a non-readonly public parameter property.
- **No `prototype` manipulation.**
- No trailing semicolons after class declarations; blank lines between method declarations.

Use TS-native class features (`private`, `readonly`, parameter properties); avoid `#private` and prototype manipulation.

---

## Functions

- **Prefer function declarations** for named top-level functions.
- **Prefer arrow functions** for callbacks and inline functions; never named function expressions (use arrow instead).
- Arrow function body: `{ }` block when return value is unused; concise body when return value is used.
- Use rest params instead of `arguments`; spread instead of `Function.apply`.
- **Never `bind()` in event listener registration** — use arrow function properties for stable uninstall references.
- **Never use `this` outside class methods, constructors, or arrow functions.**

Prefer function declarations for top-level APIs and arrow functions for callbacks. Avoid `bind()` in event registration.

---

## Control Flow

- Always use braces `{}` for control flow blocks (exception: single-line `if` on one line is acceptable).
- `===` / `!==`; use `== null` only to check both `null` and `undefined` together.
- `switch` must have a `default` case (last); no fallthrough in non-empty cases.
- `throw new Error(...)` — never throw strings or plain objects; only `Error` subclasses.
- `catch (e: unknown)` — assert `e instanceof Error` before accessing properties.
- Empty catch blocks require an explanatory comment.
- Type assertions: `as Foo` not `<Foo>`.

Use strict equality, always throw `Error` objects, and prefer `as` assertions over angle-bracket syntax.

### Double Assertions

When a double assertion is unavoidable, use `unknown` as the intermediate:

---

## Type System

### Inference & Annotations

- **Rely on type inference** — don't annotate trivially-inferred types.
- **Annotate** when the type is non-obvious: complex async expressions, empty generics, public API return types.

Rely on inference for obvious locals; annotate non-obvious boundaries and public API returns.

### `unknown` vs `any`

- **Avoid `any`** — use `unknown` and narrow explicitly.
- Never use `object` (use `{}`, a specific type, or `Record<string, unknown>`).

Prefer `unknown` over `any`; narrow with type guards before use.

### Interfaces vs Types

- Use **interfaces** for structural/object types.
- Use **type aliases** for unions, intersections, and mapped types.
- Never use a `class` purely as a structural type — use an interface.

Use `interface` for structural object shapes and `type` aliases for unions/mapped/intersection types.

### Null & Optional

- Use `undefined` or `null` contextually; never add `|null` or `|undefined` to type aliases.
- Prefer optional `?` over explicit `|undefined` for parameters and fields.

Prefer optional `?` for parameters/fields instead of explicit `| undefined` unions.

### Enums

- Use plain `enum` — `const enum` is **banned**.
- Use enums for small, stable domain vocabularies such as persisted identifiers,
  state names, and resource categories.
- Prefer a string union for local or ad-hoc values when it is clearer.

Use plain enums for stable domain values; avoid `const enum`.

### Readability-first type design

- Use `satisfies` only when preserving inferred literal types materially improves
  an API. Prefer explicit interfaces or annotations when they are clearer.
- Do not use `satisfies`, enums, `as const`, or type assertions as runtime
  validation. Parse and validate configuration, API input, and external data.
- Prefer named `FooArgs` interfaces for reusable functions with non-trivial
  parameter objects.
- Avoid clever inferred public types such as
  `(typeof Values)[keyof typeof Values]` when an explicit enum or interface is
  easier to discover and understand.
- Use `as const` for simple immutable data when literal inference is useful;
  do not use it as a default object-declaration pattern.

Prefer code that makes domain vocabulary and public contracts obvious to a
reader over compact inference-heavy declarations.

### Wrapper Objects

- **Never** use wrapper object instantiation.

Never instantiate wrapper objects (`new String`, `new Boolean`, `new Number`); use primitives.

---

## Naming

| Identifier | Convention | Examples |
|---|---|---|
| Class, Interface, Type, Enum | `UpperCamelCase` | `UserService`, `HttpClient`, `Direction` |
| Variable, Parameter, Function, Method, Property | `lowerCamelCase` | `userId`, `getUser`, `isActive` |
| Module-level constant, Enum value | `CONSTANT_CASE` | `MAX_RETRIES`, `DEFAULT_TIMEOUT` |
| Module alias | `lowerCamelCase` | `import * as httpClient from '...'` |

**Rules:**

- Identifiers: ASCII letters, digits, underscores only in constants/test names; rare `$` (only when required by framework).
- No `_` prefix/suffix for private members; TypeScript `private` handles visibility.
- No `I` prefix for interfaces (`UserService` not `IUserService`).
- No `opt_` prefix for optional parameters.
- **Treat acronyms as words**: `loadHttpUrl` not `loadHTTPURL`; `xmlParser` not `XMLParser`. Exception: platform APIs that define their own casing (`XMLHttpRequest`).
- **Local constants**: `lowerCamelCase`, not `CONSTANT_CASE` (only module-level constants use `CONSTANT_CASE`).

Key naming rules: no `I` prefix for interfaces, acronyms as words (`httpUrl`), and `CONSTANT_CASE` only for module-level constants.

---

## Comments & JSDoc

- `/** */` JSDoc for all public API symbols (classes, interfaces, functions, enums, properties).
- `/** @fileoverview ... */` for file-level documentation.
- `@param` and `@return` only when they add information not in the type signature.
- `//` for implementation notes; `/* */` is not used for JSDoc-style comments.
- Comment *why*, not *what* — code should be self-documenting for the "what".

Use JSDoc for public APIs and comments for non-obvious *why* decisions.

---

## Formatting

Formatting is enforced by **Prettier** (and optionally clang-format). Do not hand-format code that tools will reformat.

| Rule | Value |
|---|---|
| Indentation | 2 spaces; no tabs |
| Quotes | Single `'`; template literals for interpolation/multiline |
| Semicolons | Required at end of statements (no ASI reliance) |
| Line length | 80-column soft limit |
| Trailing commas | In multi-line arrays, objects, and parameter lists |
| Blank lines in blocks | None at start/end of blocks |

Let Prettier enforce formatting; avoid hand-formatting conventions beyond configured tools.

---

## Disallowed Features

Hard bans — **never use these:**

Keep this list short and strict: `var`, default exports, `export let`, `#private`, `const enum`, wrapper objects, `eval`/`Function`, `debugger`, `any` (except strict interop), and `for...in` over arrays.

---

## Decorators

- Only use framework-provided decorators (e.g., Angular `@Component`, Polymer `@property`).
- **Do not define new decorators** in application code — the decorator proposal has been unstable.

```typescript
// ✅ Framework decorator — acceptable
@Component({selector: 'app-root', template: '<h1>Hello</h1>'})
class AppComponent {}

// ❌ Custom application decorator
function log(target: any, key: string, descriptor: PropertyDescriptor) { ... }
```

---

## Skill Loading Triggers

| Situation | Load skills |
|---|---|
| Writing any TypeScript code | `standards-typescript` + `standards-code` |
| TypeScript API / module design | `standards-typescript` + `role-architect` |
| Writing TypeScript tests | `standards-typescript` + `standards-testing` |
| Auth, secrets, user input handling | `standards-security` |
| Implementing features/fixes (TDD) | `role-developer` |
| TS PR review | `role-code-review` |

## Verification Checklist

- [ ] `npx tsc --noEmit` passes with no errors
- [ ] `npx eslint --ext .ts .` passes
- [ ] `npx prettier --check .` passes
- [ ] Strict mode is enabled in `tsconfig`
- [ ] No `var`, default exports, `export let`, `#private`, `const enum`, or wrapper object constructors
- [ ] `unknown` is used instead of `any` unless interop absolutely requires otherwise
- [ ] Type-only imports use `import type`
- [ ] Public APIs include JSDoc; comments explain *why*, not *what*
- [ ] Error handling uses `catch (e: unknown)` and throws `Error` objects
- [ ] Arrays/objects use idiomatic iteration (`for...of`, `Object.entries/keys/values`)
- [ ] Naming conventions are respected (no `I` prefix, acronyms as words)
