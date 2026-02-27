---
name: standards-go
description: MUST load when writing or reviewing Go code; SHOULD load for Go architectural or API design decisions. Provides idiomatic Go patterns, error handling, resource management, generics, and design pattern guidance.
license: MIT
compatibility: opencode
metadata:
  role: standards
  domain: go
  priority: high
---

# Go Standards

**Provides:** Idiomatic Go patterns, error handling, resource management, naming & package conventions, API type design, generics, and common design patterns. For concurrency, testing, and performance see the dedicated subskills.

**Primary references:**

- [Effective Go](https://go.dev/doc/effective_go)
- [Go CodeReviewComments](https://github.com/golang/go/wiki/CodeReviewComments)
- [Uber Go Style Guide](https://github.com/uber-go/guide/blob/master/style.md)
- [Google Go Style Guide](https://google.github.io/styleguide/go/guide) / [Decisions](https://google.github.io/styleguide/go/decisions) / [Best Practices](https://google.github.io/styleguide/go/best-practices)

## Quick Reference

**Golden Rule**: Explicit is better than implicit; clarity beats cleverness

**Style principles (priority order):**

| Principle       | Key question                              |
| --------------- | ----------------------------------------- |
| Clarity         | Can a reader understand what and why?     |
| Simplicity      | Is this the simplest approach?            |
| Concision       | Is the signal-to-noise ratio high?        |
| Maintainability | Can this be safely modified later?        |
| Consistency     | Does this match surrounding code?         |

**Do** (✅):

- Run `gofmt`/`goimports` on every save
- Use MixedCaps for identifiers; avoid underscores (exceptions: `Test*`/`Benchmark*`/`Example*` names in `*_test.go`, and rare low-level interop like `syscall`/cgo)
- Return `error` last; wrap with `%w`; check with `errors.Is`/`errors.As` (1.13+)
- `defer` release immediately after acquisition
- Pass `context.Context` as the first argument to blocking calls
- Accept interfaces, return concrete types
- Design zero values to be usable
- Use `any` instead of `interface{}` (1.18+)
- Prefer `slices`/`maps`/`cmp` packages over manual loops (1.21+/1.22+)
- Use `min`/`max` builtins instead of if/else comparisons (1.21+)

**Don't** (❌):

- Hand-align code or use underscores in identifiers
- Stutter exported names (`bufio.BufReader` → use `bufio.Reader`)
- Discard errors with `_` silently
- Store `context.Context` in structs
- Use `panic` as flow control
- Use dot imports outside tests
- Name packages `util`, `common`, or `helpers`
- Use `interface{}` when `any` is available (1.18+)
- Write manual slice search/sort loops when `slices.*` applies (1.21+)
- Use `init()` for anything beyond simple, side-effect-free registration — prefer explicit initialization functions
- Use naked returns in functions longer than a few lines — name return values only when it genuinely aids clarity
- Define interfaces prematurely or in the implementing package — define at the point of use, as narrow as needed
- Use bare `string`/`int` as context value keys — define an unexported typed constant
- Use `http.NewRequest` for outbound calls that must respect a deadline — use `http.NewRequestWithContext`

**Key commands:**

```sh
gofmt -l .                        # list unformatted files (CI gate)
goimports -l .                    # also fixes import grouping
go vet ./...                      # catch common mistakes
golangci-lint run                 # run all configured linters
go test ./...                     # run all tests
go test -race ./...               # detect data races
go build -gcflags=all='-m' ./...  # escape analysis output
go mod tidy                       # remove unused deps, sync go.sum
GOOS=linux GOARCH=amd64 go build  # cross-compile
```

---

## Formatting & Tooling

- **gofmt / goimports**: Run on every save; CI must reject unformatted files (`gofmt -l .` produces no output). Use tabs for indentation — never hand-align or convert to spaces.
- **go vet**: Run `go vet ./...` in CI; treat all warnings as errors.
- **staticcheck / golangci-lint**: Use golangci-lint as the lint runner; configure once per repo and keep `.golangci.yml` in version control.
- **Editor integration**: Enable format-on-save using `goimports` (superset of `gofmt` — handles import grouping too).
- **go generate**: Use `//go:generate` directives to drive code generation (stringer, mockgen, protoc). Track generator tool dependencies in a `tools.go` file with a `//go:build tools` build constraint so `go mod tidy` sees them without including them in the binary.
- **pkgsite** (optional): Preview rendered godoc locally with `go install golang.org/x/pkgsite/cmd/pkgsite@latest && pkgsite` — confirms formatting of paragraphs, code blocks, and links before code review.

### Linting

Use [golangci-lint](https://github.com/golangci/golangci-lint) as the lint runner — it parallelises linters, caches results, and supports a single repo-wide config file (`.golangci.yml`).

**Minimum recommended linter set** (covers error handling, formatting, style, and common bugs):

| Linter | Purpose |
|--------|---------|
| `errcheck` | Ensure errors are handled |
| `goimports` | Format code and manage imports |
| `revive` | Style mistakes — modern, maintained replacement for the deprecated `golint` |
| `govet` | Common mistake analysis (same as `go vet`) |
| `staticcheck` | Advanced static analysis |

> **`golint` is deprecated — do not add it.** Use `revive` instead.

**Sample `.golangci.yml`** (place in project root):

```yaml
linters:
  enable:
    - errcheck
    - goimports
    - revive
    - govet
    - staticcheck

linters-settings:
  goimports:
    local-prefixes: github.com/your-org/your-repo
  revive:
    rules:
      - name: blank-imports
      - name: context-as-argument
      - name: error-return
      - name: error-strings
      - name: exported

run:
  timeout: 5m
```

Run linting with:

```sh
golangci-lint run          # lint all packages
golangci-lint run ./pkg/... # lint specific path
```

Add `golangci-lint run` to CI alongside `go vet ./...`; treat any finding as a build failure.

### Printf-Style Formatting

- If a format string is stored in a variable, make it a `const` so `go vet` can analyze it.
- Prefer using `Printf`-family names (or names ending in `f`, e.g., `Wrapf`) for `fmt.Printf`-style helpers so `go vet` can treat them as format functions.

```go
// ❌ Bad: format string in a mutable var
msg := "unexpected values %v, %v\n"
fmt.Printf(msg, a, b)

// ✅ Good
const msg = "unexpected values %v, %v\n"
fmt.Printf(msg, a, b)
```

### Import Grouping

Imports are organized in groups separated by blank lines. Standard library packages are always in the first group; external packages follow. `goimports` enforces this automatically.

```go
// Minimal (Uber): stdlib, then everything else
import (
    "fmt"
    "os"

    "go.uber.org/atomic"
    "golang.org/x/sync/errgroup"
)

// Extended (Google): stdlib -> other -> proto -> side-effects
import (
    "fmt"
    "os"

    "github.com/foo/bar"

    foopb "myproj/foo/proto/foo_go_proto"

    _ "myproj/rpc/protocols/dial"
)
```

### Blank Imports

`import _ "pkg"` imports a package solely for its side effects (e.g., driver registration, codec init). Restrict blank imports to `main` packages and test files — they must not appear in library packages where callers cannot predict the side effect.

```go
// Good: blank import in main package (registers image/jpeg codec)
package main

import (
    _ "image/jpeg"
    _ "time/tzdata"
)
```

## Code Style

### Reduce Nesting

Handle error cases and special conditions first; return early or `continue` to keep the happy path unindented.

```go
// Bad: deeply nested
for _, v := range data {
    if v.F1 == 1 {
        v = process(v)
        if err := v.Call(); err == nil {
            v.Send()
        } else {
            return err
        }
    } else {
        log.Printf("Invalid v: %v", v)
    }
}

// Good: flat structure with early returns
for _, v := range data {
    if v.F1 != 1 {
        log.Printf("Invalid v: %v", v)
        continue
    }
    v = process(v)
    if err := v.Call(); err != nil {
        return err
    }
    v.Send()
}
```

### Avoid Unnecessary Else

When both branches of an `if` set the same variable, use a default + override pattern:

```go
// Bad: setting in both branches
var a int
if b {
    a = 100
} else {
    a = 10
}

// Good: default + override
a := 10
if b {
    a = 100
}
```

### Line Length

There is no hard line-length limit in Go. Guidelines:

- Prefer to **refactor** when a line feels too long (shorter names help more than wrapping).
- If splitting is needed, put all arguments on their own lines (break by semantics, not length).
- Do not split long string literals (e.g., URLs) across lines.
- Uber's style guide suggests a soft limit of 99 characters; apply if the team adopts it.

### Indentation Confusion & Line Breaks

- Prefer keeping `if`/`for` conditions and function signatures on a single line.
- If a conditional is too long, extract well-named booleans (and other intermediate values) rather than splitting the `if` line in a way that visually aligns with the indented block.
- Do not move `{` to the next line for control structures (`if`, `for`, `switch`, `select`) — Go's semicolon insertion rules make this invalid.

```go
// ✅ Prefer extracted locals
inTransaction := db.CurrentStatusIs(db.InTransaction)
keysMatch := db.ValuesEqual(db.TransactionKey(), row.Key())
if inTransaction && keysMatch {
    return nil
}

// ❌ Avoid multiline if that looks like the indented block
if db.CurrentStatusIs(db.InTransaction) &&
    db.ValuesEqual(db.TransactionKey(), row.Key()) {
    return nil
}
```

```go
// Bad: arbitrary mid-line break
func (s *Store) GetUser(ctx context.Context,
    id string) (*User, error) {

// Good: all arguments on own lines when splitting is necessary
func (s *Store) GetUser(
    ctx context.Context,
    id string,
) (*User, error) {
```

### Parentheses

Go control structures (`if`, `for`, `switch`) do not take parentheses. The operator-precedence hierarchy is shorter and clearer than C/Java, so spacing is meaningful: `x<<8 + y<<16` means what it looks like. Add parentheses only to clarify non-obvious precedence.

### Local Consistency

When multiple styles are acceptable and no rule applies, match the style of the surrounding file/package. Do not introduce a second convention without a strong reason.

### Least Mechanism

Prefer the simplest tool that works:

1) core language constructs (struct/slice/map/channel)
2) standard library
3) well-adopted libraries

Add dependencies and abstraction only when they clearly improve correctness, simplicity at call sites, or performance.

### Signal Boosting

When code is intentionally unusual (looks like a common idiom but behaves differently), add a short comment to call attention to it.

```go
// ✅ Signal-boost an unusual condition
if err := doSomething(); err == nil { // if NO error
    // ... intentionally inverted
}
```

### Control Flow Idioms

- **`if` with initializer**: `if` (and `switch`) accept an optional init statement; use it to scope short-lived variables — especially `err` — to the block:

  ```go
  if err := file.Chmod(0664); err != nil {
      return err
  }
  // err is not in scope here
  ```

- **`:=` redeclaration rule**: A variable already declared in the *same scope* may reappear on the left side of `:=` as long as at least one other variable in that statement is new. This is how `err` can be reused across a chain of calls without a new `var` declaration. ⚠️ **Shadowing trap**: if the existing variable lives in an *outer* scope, `:=` creates a brand-new inner variable and the outer one is silently unchanged — a common source of bugs.

  ```go
  var err error
  if condition {
      x, err := someFunc() // ← new inner 'err'; outer err stays nil
      _ = x
  }
  // outer err is still nil — almost certainly a bug
  ```

- **`range` over strings iterates runes (not bytes)**: `for i, r := range s` yields each Unicode code point (`rune`) decoded from the UTF-8 stream; `i` is the byte offset of that rune, not its sequential index. Use `[]byte(s)` if you need raw byte access.

- **Switch**:
  - No implicit fallthrough — each `case` body ends cleanly; add the explicit `fallthrough` keyword only when you genuinely want C-style fall-through.
  - Expression-less switch (`switch { case cond: … }`) switches on `true` — a clean alternative to long `if-else if` chains.
  - Comma-separated cases share a body without fallthrough: `case 'a', 'e', 'i', 'o', 'u':`.
  - **Labeled break** exits an enclosing loop (plain `break` exits only the `switch`):

    ```go
    Loop:
        for _, v := range data {
            switch v {
            case terminator:
                break Loop // exits the for loop
            }
        }
    ```

### Reduce Scope of Variables

Declare variables as close as possible to their use. Prefer `if`/`switch` initializers to keep temporary values scoped to the block, and avoid pre-declaring `var x` far above where it is used.

### Avoid Naked Parameters

Naked boolean parameters and repeated literals in function calls hurt readability. If meaning is not obvious, either:

- add inline C-style comments at the call site (`true /* isLocal */`), or
- replace `bool` parameters with small custom types/enums so call sites are self-describing.

```go
// func printInfo(name string, isLocal, done bool)

// ❌ Hard to read
printInfo("foo", true, true)

// ✅ Better: name the booleans at the call site
printInfo("foo", true /* isLocal */, true /* done */)
```

### Raw String Literals

Use raw string literals (backticks) to avoid hand-escaped strings; they are easier to read and review.

```go
// ❌ Escapes are hard to scan
wantError := "unknown error:\"test\""

// ✅ Clear
wantError := `unknown error:"test"`
```

## Naming & Packages

- Package names: lowercase, single word, matches directory name. Avoid `util`, `common`, `helpers`, `misc`.
- Exported names must not stutter: `http.Client` not `http.HTTPClient`; `bufio.Reader` not `bufio.BufReader`.
- Use MixedCaps (camelCase / PascalCase) for identifiers; no underscores. Exceptions: `Test*`/`Benchmark*`/`Example*` names in `*_test.go` may include underscores; low-level OS/cgo interop may reuse OS identifiers.
- Getters named as the field: `Owner()` not `GetOwner()`; setters: `SetOwner(v)`. Use `Compute`/`Fetch` for expensive operations.
- Single-method interfaces: suffix with `-er` (`io.Reader`, `http.Handler`); define at point of use, not in the implementing package; honor canonical signatures (`Read`, `Write`, `Close`, `String`).
- Doc comments on every exported symbol: `// FunctionName does X.` — godoc is the authoritative API surface.

```go
// ✅ Good
package user

// Store persists and retrieves users.
type Store interface {
    Get(ctx context.Context, id string) (*User, error)
    Save(ctx context.Context, u *User) error
}

// ❌ Bad — stutters, wrong package name
package userutil

type UserStore interface { ... }
```

### Documentation (godoc)

- **Comment style**: Start with the name being documented (article "a"/"an"/"the" is fine before it); use a full sentence with capitalization and punctuation. Example: `// A Request represents a request to run a command.` or `// Encode writes the JSON encoding of req to w.`
- **Package comment**: Every package needs exactly one; place it in `doc.go` for large packages. For `main` packages describe the command: `// The seed_generator command generates a Finch seed file.`
- **Parameters / config**: Document only non-obvious behavior and edge cases; do not restate what parameter names already say clearly.
- **Context cancellation**: Implied — don't restate it. Document only when behavior differs (e.g., `// If the context is cancelled, Run returns a nil error.` or when a deadline must _not_ be set).
- **Concurrency**: Read-only operations are assumed safe; mutating operations are assumed unsafe. Add a note only when this is ambiguous or when the type is explicitly safe for concurrent use: `// It is safe for simultaneous use by multiple goroutines.`
- **Cleanup**: Always state when the caller must release a resource: `// Call Stop to release the Ticker's associated resources when done.`
- **Errors**: Document sentinel errors (`// At end of file, Read returns 0, io.EOF.`) and custom error types — use the pointer form (`*PathError`, not `PathError`) so callers know the correct target for `errors.As`.
- **Godoc formatting**: Blank line between paragraphs (`//` line); indent code blocks by two extra spaces; use verbatim lines for short lists.

```go
// NewTicker returns a new Ticker containing a channel that will send the
// current time after each tick.
//
// The duration d must be greater than zero; otherwise NewTicker panics.
//
// Call Stop to release the Ticker's associated resources when done.
//
//   t := time.NewTicker(500 * time.Millisecond)
//   defer t.Stop()
func NewTicker(d time.Duration) *Ticker
```

### Receiver Names

Receiver variables must be a short (one or two letter) abbreviation of the type, used consistently across all methods of that type. Never use `this` or `self`.

```go
// ✅ Good — short, consistent, type-derived
func (c *Client) Connect() error { ... }
func (c *Client) Send(msg []byte) error { ... }
func (c *Client) Close() error { ... }

// ❌ Bad — verbose, OOP-style, or inconsistent
func (client *Client) Connect() error { ... }
func (this *Client) Send(msg []byte) error { ... }
func (cl *Client) Close() error { ... }
```

### Initialisms and Acronyms

Initialisms (URL, ID, HTTP, API, RPC, SQL, JSON, XML, TTL, TLS, etc.) must be cased uniformly — all uppercase when exported, all lowercase when unexported. Never mix cases within an initialism.

```go
// ✅ Good
var userID string
func ParseURL(s string) (*url.URL, error)
type HTTPClient struct{ ... }
func newHTTPClient() *HTTPClient { ... }

// ❌ Bad
var userId string        // mixed case in initialism
func ParseUrl(s string)  // mixed case in initialism
type HttpClient struct{}  // inconsistent casing
```

Common initialisms to watch: `ACL`, `API`, `ASCII`, `CPU`, `CSS`, `DNS`, `EOF`, `GUID`, `HTML`, `HTTP`, `HTTPS`, `ID`, `IP`, `JSON`, `LHS`, `QPS`, `RAM`, `RHS`, `RPC`, `SLA`, `SMTP`, `SQL`, `SSH`, `TCP`, `TLS`, `TTL`, `UDP`, `UI`, `UID`, `UUID`, `URI`, `URL`, `UTF8`, `VM`, `XML`, `XSRF`, `XSS`.

### Constant Naming

Constants use MixedCaps like all other identifiers. Never use ALL_CAPS or a `k` prefix.

```go
// ✅ Good — MixedCaps, name explains role
const MaxPacketSize = 512
const defaultTimeout = 30 * time.Second
const MaxRetries = 3

// ❌ Bad
const MAX_PACKET_SIZE = 512  // no ALL_CAPS
const kDefaultTimeout = 30   // no k prefix
const Three = 3              // name should express role, not value
```

### Avoid Predeclared Names

Do not name variables, parameters, fields, or methods after Go's predeclared identifiers (e.g., `error`, `string`, `int`, `len`, `make`, `new`, `close`). Shadowing makes code hard to read and grep, and can create subtle bugs.

```go
// ❌ Bad
func handleErrorMessage(error string) { ... }

type Foo struct {
    error  error
    string string
}

// ✅ Good
func handleErrorMessage(msg string) { ... }

type Foo struct {
    err error
    str string
}
```

### Import Renaming

When a local import alias is necessary, it must follow the same package naming rules — lowercase, no underscores.

Avoid renaming imports unless there is a genuine name collision. When a collision occurs, prefer renaming the most local or project-specific import (keep stdlib and well-known packages under their canonical names). Generated protocol buffer packages must be renamed: strip underscores and add a `pb` suffix.

If the package name does not match the last element of its import path (e.g., `client-go`, `trace/v2`), aliasing is required so the import name matches the package name.

```go
// Good: proto packages renamed with pb suffix
import (
    foosvcpb "path/to/foo_service_go_proto"
    userpb   "path/to/user_go_proto"
)

// Good: stdlib renamed only when a local variable would shadow it
import (
    urlpkg "net/url"
)

func parseEndpoint(url string) (*urlpkg.URL, error) {
    return urlpkg.Parse(url)
}

// Bad: underscore in alias
import foo_pb "path/to/foo_go_proto"
```

### Avoiding Repetition

Beyond stutter avoidance, names should not feel redundant when read in full context. Consider the package qualifier, receiver type, and surrounding code when choosing a name.

```go
// ✅ Good — concise in context
widget.New()             // not widget.NewWidget()
func (p *Project) Name() // not p.ProjectName()
// package db:
func Load() error        // callers write db.Load(), not db.LoadFromDatabase()

// ❌ Bad — repetitive in context
widget.NewWidget()
func (c *Config) WriteConfigTo(w io.Writer) error
```

## API & Type Design

- `Struct Literals & Zero Values` describes how to keep structs zero-value ready, favor keyed literals, and format multi-line literals.
- `Slice & Map Idioms` covers capacity hints, nil vs non-nil slices, comma-ok access, defensive copies, and when to rely on `slices`/`maps` helpers.
- `Type Safety Pitfalls` calls out Stringer recursion, copying hazards, and other traps that arise when values wrap mutable or synced state.
- `Enum / Iota Values` and `Time: Use time.Time and time.Duration` explain enum defaults plus the preferred types for instants and durations.
- Keep APIs interface-friendly: take interface values, return concrete types, avoid pointers to interfaces, and use `any` when a placeholder is needed (see Quick Reference for full context).

```go
type Config struct {
    Timeout time.Duration
}

func DefaultConfig() Config {
    return Config{
        Timeout: 30 * time.Second,
    }
}
```

### Struct Literals & Zero Values

- Prefer keyed struct literals by default. Positional struct literals are acceptable only in small, local table tests (3 fields or fewer) where meaning is obvious.
- Omit zero-value fields in keyed literals unless the field name adds meaningful context (common in table tests).
- When a value is truly the zero value, prefer `var t T` over `t := T{}`.
- Prefer `&T{...}` over `new(T)` for struct pointers (consistent with literal initialization).
- For multi-line literals, keep the closing brace aligned with the opening brace and include trailing commas; let `gofmt` handle formatting.
- In slice/map literals, omit repeated type names when it improves readability; `gofmt -s` can simplify many cases.

### Slice & Map Idioms

**`append` always returns a new slice header — always assign the result:**

```go
// ✅ Correct
items = append(items, newItem)
items = append(items, other...)

// ❌ Discards the result — may silently no-op when capacity grows
append(items, newItem)
```

**Nil vs empty slice** — prefer `var s []T` (nil slice) over `s := []T{}` (non-nil empty). Both have `len == 0` and work with `append`, `range`, etc.

> **JSON exception**: a nil slice encodes to `null`; `[]T{}` encodes to `[]`. Use a non-nil slice when the JSON consumer must receive an array:
>
> ```go
> var tags []string   // → JSON null
> tags := []string{} // → JSON []
> ```

When designing APIs, **do not distinguish** between a nil and a non-nil zero-length slice — callers should not need to care.

**Two-dimensional slices** — two allocation strategies:

```go
// Method 1: independent inner slices (can grow independently)
grid := make([][]uint8, rows)
for i := range grid {
    grid[i] = make([]uint8, cols)
}

// Method 2: single backing array (fewer allocations; fixed inner size)
grid := make([][]uint8, rows)
buf := make([]uint8, rows*cols)
for i := range grid {
    grid[i], buf = buf[:cols], buf[cols:]
}
```

Prefer Method 2 for fixed-size, performance-sensitive grids; Method 1 when inner slices must grow independently.

**Map comma-ok — always use the two-value form to detect presence:**

```go
val, ok := m[key]
if !ok {
    // key absent — val is the zero value
}

// Combined with if initializer:
if v, ok := m[key]; ok {
    return v
}
```

**Set representation** — prefer `map[T]struct{}` over `map[T]bool`; zero-size values consume no heap:

```go
// ✅ Set with struct{}
seen := make(map[string]struct{})
seen["alice"] = struct{}{}
if _, ok := seen["alice"]; ok { ... }

// ❌ bool wastes a byte per entry and invites accidental false values
seen := map[string]bool{"alice": true}
```

**Copy slices and maps at API boundaries** — slices and maps hold pointers to underlying data; storing or returning them without copying leaks internal state and enables accidental mutation by callers:

```go
// ❌ Receiving: caller still owns the underlying array
func (d *Driver) SetTrips(trips []Trip) {
    d.trips = trips // caller can mutate d.trips
}

// ✅ Receiving: defensive copy
func (d *Driver) SetTrips(trips []Trip) {
    d.trips = make([]Trip, len(trips))
    copy(d.trips, trips)
}

// ❌ Returning: exposes internal state
func (s *Stats) Snapshot() map[string]int {
    s.mu.Lock()
    defer s.mu.Unlock()
    return s.counters // caller can mutate s.counters!
}

// ✅ Returning: return a copy
func (s *Stats) Snapshot() map[string]int {
    s.mu.Lock()
    defer s.mu.Unlock()
    result := make(map[string]int, len(s.counters))
    for k, v := range s.counters {
        result[k] = v
    }
    return result
}
```

For Go 1.21+, prefer `slices.Clone` and `maps.Clone` over manual `copy`/loop.

### Type Safety Pitfalls

**Stringer recursion** — implementing `String() string` and calling `fmt.Sprintf("%s", receiver)` inside it causes infinite recursion because `%s` invokes `String()` again. Convert to the underlying type first:

```go
type MyString string

// ❌ Infinite recursion — %s calls String() on m (MyString)
func (m MyString) String() string {
    return fmt.Sprintf("MyString=%s", m)
}

// ✅ Convert to basic type to break the recursion
func (m MyString) String() string {
    return fmt.Sprintf("MyString=%s", string(m))
}
```

The same trap applies to any named type wrapping a type with a `String()` method (e.g., a named `[]byte`).

**Copying hazards** — do not copy a value of type `T` when its methods are defined on `*T`, or when it contains an internal slice or synchronization primitive. Copies alias the same underlying state and cause subtle bugs:

```go
// ❌ Copying bytes.Buffer — the copy's slice aliases the original's array
var buf1 bytes.Buffer
buf1.WriteString("hello")
buf2 := buf1 // buf2 shares buf1's internal array

// ❌ Copying a mutex — the lock state is duplicated, not shared
var mu sync.Mutex
mu2 := mu // almost always a bug; go vet flags this

// ✅ Pass by pointer instead
func process(buf *bytes.Buffer) { ... }
func increment(mu *sync.Mutex, count *int) {
    mu.Lock(); defer mu.Unlock()
    *count++
}
```

Types to never copy: `bytes.Buffer`, `strings.Builder`, `sync.Mutex`, `sync.RWMutex`, `sync.WaitGroup`, `sync.Cond`, and any struct embedding them. `go vet` catches most violations via its `copylock` pass.

### Enum / Iota Values

Start iota-based enums at `iota + 1` so the zero value means "unset/unknown" and is distinguishable from a valid entry:

```go
// ✅ Zero means "uninitialized"
type Operation int

const (
    Add      Operation = iota + 1
    Subtract
    Multiply
)

// ✅ Exception: when zero is the meaningful default
type LogDestination int

const (
    LogToStdout LogDestination = iota // 0 = stdout is a sensible default
    LogToFile
)
```

### Time: Use `time.Time` and `time.Duration`

Represent instants with `time.Time` and durations with `time.Duration` — never raw `int` or `int64`. Raw integers carry no unit information and force callers to guess (seconds? milliseconds?).

```go
// ❌ Ambiguous — milliseconds? seconds?
func poll(delay int) { time.Sleep(time.Duration(delay) * time.Millisecond) }

// ✅ Self-documenting
func poll(delay time.Duration) { time.Sleep(delay) }
poll(10 * time.Second)

// ❌ Opaque: what epoch? what unit?
func isActive(now, start, stop int) bool { return start <= now && now < stop }

// ✅ Correct comparison semantics
func isActive(now, start, stop time.Time) bool {
    return !now.Before(start) && now.Before(stop)
}
```

If a JSON/YAML schema forces you to use a raw integer, **include the unit in the field name**:

```go
// ❌ Ambiguous
type Config struct {
    Interval int `json:"interval"`
}

// ✅ Unit encoded in the name
type Config struct {
    IntervalMillis int `json:"intervalMillis"`
}
```

### Marshaling: Always Use Explicit Field Tags

Any struct that is serialized to JSON, YAML, TOML, etc. must carry explicit field tags. Without tags, the wire name equals the Go field name — renaming either breaks the serialization contract silently.

```go
// ❌ Wire name is tightly coupled to the Go field name
type Stock struct {
    Price int
    Name  string
}

// ✅ Wire contract is explicit and survives field renames
type Stock struct {
    Price int    `json:"price"`
    Name  string `json:"name"`
}
```

Use `omitempty` (or `omitzero` on Go 1.24+ for zero-value structs and `time.Time`) when absent fields should be omitted; add `yaml:` or `toml:` tags alongside `json:` when multiple formats are needed.

### Avoid Mutable Package-Level Globals

Mutable globals make code hard to test and reason about. Prefer **dependency injection** — pass dependencies as struct fields or constructor arguments.

```go
// ❌ Mutable global — tests must save/restore it
var _timeNow = time.Now

func sign(msg string) string { return signWithTime(msg, _timeNow()) }

// ✅ Injected dependency — tests supply their own clock
type signer struct{ now func() time.Time }

func newSigner() *signer { return &signer{now: time.Now} }

func (s *signer) Sign(msg string) string { return signWithTime(msg, s.now()) }
```

Read-only package-level vars (sentinel errors, compiled regexps, `sync.Once`-initialized values) are fine. The concern is **writable** globals that change program behaviour between calls.

### Cryptographically Secure Randomness

Never use `math/rand` (or `math/rand/v2`) to generate keys, tokens, session IDs, or any security-sensitive value. Time-seeded or default-seeded generators have predictable output and can be broken by an attacker.

```go
// ❌ Predictable — do not use for secrets
id := fmt.Sprintf("%x", rand.Int63())

// ✅ Use crypto/rand for any security-sensitive identifier
import "crypto/rand"

// Go 1.22+: rand.Text() returns a base32-encoded random string
token := rand.Text()

// Earlier versions: encode random bytes manually
buf := make([]byte, 32)
if _, err := rand.Read(buf); err != nil { ... }
token := hex.EncodeToString(buf)
```

> ⚠️ **Security**: See `standards-security` for broader guidance on secret management, token storage, and authentication patterns.

### Functional Options

Use functional options when a constructor or public API has **3+ independent optional parameters** or when the API is expected to grow new options over time. Prefer a plain config struct when options are few, all usually specified together, or the API is internal-only.

The preferred pattern (Uber style) uses an **exported `Option` interface** with an **unexported `apply` method** so only this package can implement it. This enables options to be compared in tests, implement `fmt.Stringer` for debugging, and appear as named types in generated documentation — advantages closures (`type Option func(*options)`) do not provide. Closure-based options are acceptable for small or package-internal APIs where those benefits are not needed.

```go
// options holds all configuration; unexported.
type options struct {
    port    int
    timeout time.Duration
}

// Option is the public handle; unexported apply prevents external implementations.
type Option interface {
    apply(*options)
}

type portOption int

func (p portOption) apply(o *options) { o.port = int(p) }

// WithPort sets the listening port.
func WithPort(p int) Option { return portOption(p) }

type timeoutOption struct{ d time.Duration }

func (t timeoutOption) apply(o *options) { o.timeout = t.d }

// WithTimeout sets the request timeout.
func WithTimeout(d time.Duration) Option { return timeoutOption{d} }

// NewServer creates a server, applying opts over safe defaults.
func NewServer(opts ...Option) *Server {
    o := options{port: 8080, timeout: 30 * time.Second}
    for _, opt := range opts {
        opt.apply(&o)
    }
    return &Server{port: o.port, timeout: o.timeout}
}
```

### Receiver Type Selection

Use a **pointer receiver** when:
- The method mutates the receiver.
- The struct contains a `sync.Mutex` or similar (copying breaks locking).
- The struct is large enough that copying all fields would be expensive.

Use a **value receiver** when:
- The type is small and immutable (e.g., `time.Time`, `Point`).
- The field types are maps, funcs, or chans (already reference types; no pointer needed).
- The method doesn't reslice or reallocate a slice field.

**Consistency rule**: if any method on a type needs a pointer receiver, use pointer receivers for _all_ methods on that type. Mixed receiver sets are confusing and prevent the type from satisfying interfaces consistently.

**Pitfall**: values stored in maps are not addressable, so pointer-receiver methods cannot be called on `map[K]T` values. If the type needs pointer receivers, store pointers in the map (`map[K]*T`).

```go
// ✅ Consistent pointer receivers — Len() could be a value receiver,
// but pointer is correct here because Write/Read already are
type Buffer struct{ data []byte }
func (b *Buffer) Write(p []byte) (int, error) { b.data = append(b.data, p...); return len(p), nil }
func (b *Buffer) Read(p []byte) (int, error)  { /* ... */ return 0, nil }
func (b *Buffer) Len() int                    { return len(b.data) }

// ✅ Value receivers: small, no mutation, no locks
type Point struct{ X, Y float64 }
func (p Point) Distance(q Point) float64 { return math.Hypot(q.X-p.X, q.Y-p.Y) }
func (p Point) String() string           { return fmt.Sprintf("(%.2f, %.2f)", p.X, p.Y) }
```

> **When in doubt, use a pointer receiver.**

### Interface Satisfaction Check

Use a blank-identifier compile-time assertion to ensure a type implements an interface — catches drift without a runtime test:

```go
var _ io.Reader   = (*MyReader)(nil)
var _ io.Writer   = (*MyWriter)(nil)
var _ http.Handler = (*MyHandler)(nil)
```

### Type Assertions & Type Switches

Prefer the two-value form to avoid panics; use type switches for exhaustive branching:

```go
// ✅ Safe assertion
if rw, ok := w.(io.ReadWriter); ok { /* w also reads */ }

// ✅ Type switch
switch v := val.(type) {
case string:  fmt.Println(v)
case int:     fmt.Println(v * 2)
default:      fmt.Printf("unknown: %T\n", v)
}

// ✅ Check optional interface at call site
if f, ok := w.(interface{ Flush() error }); ok { f.Flush() }
```

Avoid the single-value form (`v := x.(T)`) in production code: it panics on mismatch. If a panic is truly acceptable, document why.

> **Note**: type switch cases can match both concrete types and interface types in the same switch — the runtime checks whether the value satisfies the interface, so order matters when types overlap:
>
> ```go
> switch v := val.(type) {
> case string:   return v           // exact concrete type
> case Stringer: return v.String()  // interface satisfied
> }
> ```

### io.Reader / io.Writer Composition

The standard library's `io` package provides composable primitives — prefer them over bespoke wrappers:

```go
io.MultiReader(r1, r2, r3)   // read r1 to EOF, then r2, then r3 sequentially
io.TeeReader(r, w)            // reads from r and simultaneously writes to w
io.LimitReader(r, n)          // read at most n bytes from r
io.MultiWriter(w1, w2)        // writes to all writers at once (like tee for writes)
```

### Composition via Embedding

Go favors **composition over inheritance**. Embedding a type promotes its methods to the outer type — no forwarding boilerplate needed.

**Interface embedding** — combine interfaces into a broader contract:

```go
// io.ReadWriter is a union of Reader + Writer
type ReadWriter interface {
    Reader
    Writer
}
```

**Struct embedding** — promote concrete methods from an inner type:

```go
// bufio.ReadWriter gains all methods of *Reader and *Writer automatically
type ReadWriter struct {
    *Reader
    *Writer
}
// rw.Read(...) and rw.Write(...) work without explicit forwarding methods
```

**Accessing embedded fields**: use the unqualified type name as the field name (strip the package qualifier):

```go
type Job struct {
    Command string
    *log.Logger        // field name is "Logger"
}

job.Println("starting")        // promoted method
job.Logger.SetPrefix("job: ")  // access embedded field directly
```

**Method overriding**: define the same method on the outer type to intercept calls:

```go
func (j *Job) Printf(format string, args ...any) {
    j.Logger.Printf("%q: "+format, append([]any{j.Command}, args...)...)
}
```

**Name conflict rules**:
1. An outer field/method always hides the same name from embedded types.
2. If two embedded types define the same name at the same depth, accessing that name is a compile error (unless the ambiguous name is never used).

> **Important**: the receiver of a promoted method is the **inner** type, not the outer one. The embedded type is unaware it is embedded — there is no implicit `super` relationship.

> **Caution — avoid embedding in exported structs**: embedding a type in a **public/exported** struct leaks that type's entire API and makes future changes breaking:
> - Adding a method to an embedded interface is a **breaking change** for all implementors.
> - Removing a method from an embedded struct is a **breaking change** for all callers.
> - Replacing the embedded type is a **breaking change**.
>
> Prefer a **named private field + explicit forwarding methods** so you control the public surface:
>
> ```go
> // ❌ Embedding leaks AbstractList's entire API
> type ConcreteList struct {
>     *AbstractList
> }
>
> // ✅ Named field — only the methods you forward are public
> type ConcreteList struct {
>     list *AbstractList
> }
>
> func (l *ConcreteList) Add(e Entity)    { l.list.Add(e) }
> func (l *ConcreteList) Remove(e Entity) { l.list.Remove(e) }
> ```
>
> Embedding is fine for **unexported** structs and for interface composition (see above).

## Design Patterns

These patterns appear frequently in idiomatic Go codebases. Prefer the simplest option that fits the problem.

### Builder

Use a fluent builder when constructing an object requires many optional, ordered steps — particularly for query builders, HTTP clients, or test fixtures:

```go
type QueryBuilder struct {
    table   string
    wheres  []string
    orderBy string
    limit   int
}

func NewQuery(table string) *QueryBuilder { return &QueryBuilder{table: table} }

func (b *QueryBuilder) Where(cond string) *QueryBuilder {
    b.wheres = append(b.wheres, cond)
    return b
}
func (b *QueryBuilder) OrderBy(field string) *QueryBuilder { b.orderBy = field; return b }
func (b *QueryBuilder) Limit(n int) *QueryBuilder          { b.limit = n; return b }
func (b *QueryBuilder) Build() Query                       { return Query(b) }
```

> **Prefer functional options** (see above) when all parameters are independent and order doesn't matter. Use a builder only when steps have a meaningful sequence or accumulate (e.g., multiple `Where` clauses).

### Strategy

Swap algorithms or behaviours behind an interface without changing the caller:

```go
type Sorter interface {
    Sort([]int)
}

type QuickSort struct{}
func (QuickSort) Sort(s []int)  { /* ... */ }

type MergeSort struct{}
func (MergeSort) Sort(s []int)  { /* ... */ }

type Pipeline struct{ sorter Sorter }
func (p *Pipeline) Run(data []int) { p.sorter.Sort(data) }
```

Keep strategy interfaces small — a single method is ideal. The Strategy pattern is often the natural result of Go's "accept interfaces" idiom.

### Observer

Notify multiple subscribers about events without tight coupling:

```go
type Handler func(event Event)

type Bus struct {
    mu       sync.RWMutex
    handlers map[string][]Handler
}

func (b *Bus) Subscribe(topic string, h Handler) {
    b.mu.Lock()
    defer b.mu.Unlock()
    b.handlers[topic] = append(b.handlers[topic], h)
}

func (b *Bus) Publish(topic string, e Event) {
    b.mu.RLock()
    hs := b.handlers[topic]
    b.mu.RUnlock()
    for _, h := range hs {
        h(e)
    }
}
```

For high-throughput event streams prefer a channel-based approach (see `standards-go-concurrency`). Use the struct-based observer when subscribers need to be dynamically registered/deregistered.

## Project Structure

```
cmd/myapp/main.go    # Minimal — wire dependencies and call into internal packages
internal/            # Private packages; cannot be imported by external modules
pkg/                 # Public library code (optional; omit if all consumers are internal)
api/                 # API definitions (OpenAPI specs, protobuf files)
configs/             # Configuration files
testdata/            # Test fixtures; ignored by go build
```

- Keep `main` packages thin — business logic belongs in `internal/`.
- Prefer `internal/` over `pkg/` unless you intentionally publish an importable API.
- `testdata/` is the conventional home for golden files, fixtures, and fuzz corpora.

### File Organization

- Group declarations: `import (...)`, then `const (...)`, `var (...)`, `type (...)` when related.
- Keep functions grouped by receiver; keep exported APIs first.
- Place constructors (`NewT`/`newT`) right after the type definition, before methods.
- Keep plain helper functions (no receiver) near the end of the file.

### Workspaces (`go work`)

Use Go workspaces for monorepos with multiple modules that need to share local changes without `replace` directives:

```bash
go work init ./services/api ./services/worker
go work use ./shared/models   # add module
go work sync                  # sync go.sum files
```

The `go.work` file must not be committed to repos where each module is versioned independently.

### Build Tags

Use `//go:build` (Go 1.17+ syntax; `// +build` is the legacy form) to gate files by platform, environment, or test category:

```go
//go:build integration          // file only compiled when -tags=integration
//go:build linux || darwin       // platform constraint
//go:build !windows              // negation
```

Run integration tests explicitly: `go test -tags=integration ./...`; skip slow tests in CI: `go test -short ./...` (guard with `testing.Short()`).

### Version Embedding via `ldflags`

Bake build metadata into binaries at link time — no config file required:

```bash
go build -ldflags "-X main.version=1.2.3 \
  -X main.commit=$(git rev-parse --short HEAD) \
  -X main.buildTime=$(date -u +%Y-%m-%dT%H:%M:%SZ)" ./cmd/myapp
```

Declare the vars as `var version, commit, buildTime string` in the target package.

## Error Handling

- Return `error` as the last return value. Never discard with `_` without an explanatory comment.
- Wrap errors for context: `fmt.Errorf("open config: %w", err)`. Use `%w` (not `%v`) so callers can unwrap.
- Check wrapped errors with `errors.Is(err, target)` (1.13+) and `errors.As(err, &target)` (1.13+) — never use `==` for wrapped errors. In Go 1.26+, prefer `errors.AsType[T](err)` over `errors.As`.
- Sentinel errors: declare as package-level vars — `var ErrFoo = errors.New("foo")` — so callers can match without string comparison.
- Combine multiple errors with `errors.Join(err1, err2)` (1.20+) instead of manual concatenation.
- **Custom error types**: Define a struct implementing `error` when callers need to inspect structured fields (e.g., HTTP status code, field name). Implement `Error() string`; use `errors.As` to unwrap at the call site. Keep error types in the same package as the functions that return them.
- `panic` is program-fatal. Use `recover` only at package or handler boundaries (e.g., HTTP middleware). Never use panic/recover as a substitute for returning errors.

### Return the `error` Interface, Not a Concrete Type

Always return the `error` interface from exported functions. Returning a concrete error type (e.g., `*os.PathError`) creates a typed-nil trap: the function can return a nil pointer that compares non-nil as an interface value, silently breaking callers' `== nil` checks.

```go
// ❌ Bad: concrete return type — nil pointer becomes a non-nil interface
func Open(path string) *os.PathError { ... }

// ✅ Good: callers always get a real error or nil interface
func Open(path string) error { ... }
```

### Error Strings

Error strings should be **lowercase** and should **not** end with punctuation, because they typically appear embedded within a larger message.

```go
// ❌ Bad
return fmt.Errorf("Something bad happened.")

// ✅ Good
return fmt.Errorf("something bad happened")
```

**Exception**: capitalize when the string begins with an exported name, proper noun, or acronym (e.g., `"SQL query failed"`).

### Avoid In-Band Errors

Do not use magic sentinel values (`-1`, `""`, `nil`) to signal failure. Use multiple return values instead — this prevents callers from accidentally forwarding an error value to the next function.

```go
// ❌ Bad: -1 or "" to signal "not found"
func Lookup(key string) int

// ✅ Good: explicit ok/error second return
func Lookup(key string) (string, bool)
func Parse(key string) (int, error)
```

### Indent Error Flow

Handle errors first and return early; do not put the normal path in an `else` branch. See also [Reduce Nesting](#reduce-nesting) in Code Style.

- Avoid `if x, err := f(); err != nil { ... } else { use x across many lines }` — declare `x` separately when it lives beyond a few lines.

```go
// ✅ Good: error handled first, normal path unindented
x, err := f()
if err != nil {
    return err
}
// use x here

// ❌ Bad: normal code buried in else
if x, err := f(); err != nil {
    return err
} else {
    // lots of code using x
}
```

### `%v` vs `%w`

| Use `%w` | Use `%v` |
|----------|----------|
| Propagating an error up the call stack so callers can inspect it with `errors.Is`/`errors.As` | System/service boundaries where internal details should not leak |
| Adding call-site context within a single service | Logging or metrics (observability consumers don't unwrap) |
| | Redacting or transforming the error before exposing it |

```go
// ✅ %w: callers can match ErrNotFound through the chain
return fmt.Errorf("get user %s: %w", id, err)

// ✅ %v: boundary — no need for callers to unwrap an internal DB error
return fmt.Errorf("user service unavailable: %v", err)
```

### Handle Errors Once

Each error must be handled exactly **once**. Choose one strategy; never log *and* return the same error (causes duplicate log entries as the error propagates up).

| Strategy | When to use |
|----------|-------------|
| **Wrap and return** | Caller is better positioned to handle it |
| **Log and degrade** | The error is non-fatal; execution can continue |
| **Match and handle** | You can recover from specific conditions; return others |

```go
// ❌ Bad: logs AND returns — callers will log it again
if err != nil {
    log.Printf("get user: %v", err)
    return err
}

// ✅ Wrap and return
if err != nil {
    return fmt.Errorf("get user %s: %w", id, err)
}

// ✅ Log and degrade (non-fatal path)
if err := emitMetrics(); err != nil {
    log.Printf("metrics unavailable: %v", err) // execution continues
}

// ✅ Match specific error, propagate others
if errors.Is(err, ErrNotFound) {
    return defaultValue, nil
}
return zero, fmt.Errorf("lookup: %w", err)
```

```go
// ✅ Wrap and propagate
if err := db.QueryRow(ctx, q, id).Scan(&u); err != nil {
    if errors.Is(err, sql.ErrNoRows) {
        return nil, ErrNotFound
    }
    return nil, fmt.Errorf("get user %s: %w", id, err)
}

// ✅ Type-asserting an error (1.26+)
if pathErr, ok := errors.AsType[*os.PathError](err); ok {
    log.Println(pathErr.Path)
}

// ❌ Silently discard
row, _ := db.QueryRow(ctx, q, id)
```

```go
// ✅ Custom error type with structured fields
type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation error on %s: %s", e.Field, e.Message)
}

// Caller inspects the structured error
var valErr *ValidationError
if errors.As(err, &valErr) {
    log.Printf("invalid field: %s", valErr.Field)
}
```

### init() Rules

Avoid `init()` wherever possible — prefer an explicit initialization function that callers invoke. When `init()` is genuinely unavoidable (e.g., registering a `database/sql` driver, precomputing a lookup table), it must be:

1. **Completely deterministic** — same result regardless of environment or execution order.
2. **Free of ordering dependencies** — must not rely on another `init()` having run first.
3. **No global/environment state** — must not read env vars, the working directory, or `os.Args`.
4. **No I/O** — no filesystem, network, or system calls.

```go
// Bad: init() with I/O and environment dependencies
var _config Config

func init() {
    cwd, _ := os.Getwd()
    raw, _ := os.ReadFile(filepath.Join(cwd, "config.yaml"))
    yaml.Unmarshal(raw, &_config) // errors silently swallowed
}

// Good: explicit function called by main() with proper error handling
func loadConfig(path string) (Config, error) {
    raw, err := os.ReadFile(path)
    if err != nil {
        return Config{}, fmt.Errorf("read config: %w", err)
    }
    var cfg Config
    if err := yaml.Unmarshal(raw, &cfg); err != nil {
        return Config{}, fmt.Errorf("parse config: %w", err)
    }
    return cfg, nil
}
```

### Exit and log.Fatal

Call `os.Exit` or `log.Fatal*` **only in `main()`**. All other functions must return errors to signal failure. Calling these in library or helper functions causes hidden program termination that:

- Skips all deferred cleanup (`defer` is bypassed by `os.Exit`).
- Makes the function impossible to unit-test.
- Produces non-obvious control flow for callers.

Prefer the **`run() error` pattern** to keep `main()` to a single exit point:

```go
// Good: single exit point; all business logic is testable; defers always run
func main() {
    if err := run(); err != nil {
        log.Fatal(err)
    }
}

func run() error {
    args := os.Args[1:]
    if len(args) != 1 {
        return errors.New("usage: mytool <file>")
    }

    f, err := os.Open(args[0])
    if err != nil {
        return err
    }
    defer f.Close() // always executed

    // ... business logic returning errors ...
    return nil
}

// Bad: log.Fatal buried in helper — skips defers, untestable
func readFile(path string) string {
    f, err := os.Open(path)
    if err != nil {
        log.Fatal(err) // exits program here, bypasses all defers
    }
    // ...
}
```

## Resource Management

- Call `defer` to release resources **immediately** after acquisition — `f, err := os.Open(name); if err != nil { ... }; defer f.Close()`.
- Arguments to deferred calls are evaluated at the `defer` statement, not at call time. Capture loop variables explicitly when deferring inside loops.
- Pass `context.Context` as the **first argument** to every blocking or cancellable function. Do not store context in structs (it prevents deadline propagation).
- Check errors returned by `Close()` on write paths (e.g., `gzip.Writer`, `bufio.Writer`) — they can report write failures.

```go
// ✅ Defer immediately after acquisition
f, err := os.Create(path)
if err != nil {
    return fmt.Errorf("create %s: %w", path, err)
}
defer f.Close()

// ✅ Context as first argument
func FetchUser(ctx context.Context, id string) (*User, error) { ... }
```

### Context Patterns

Use context correctly throughout the call graph — for deadlines, cancellation, and request-scoped values.

**Don't create custom context types.** Always accept `context.Context` in function signatures; embedding extra methods in a custom interface breaks composability:

```go
// ❌ Custom context interface — don't do this
type MyContext interface {
    context.Context
    GetUserID() string
}

// ✅ Accept standard context.Context; extract values via helpers
func Process(ctx context.Context) error {
    userID := UserIDFromContext(ctx)
    // ...
}
```

**Application data placement** — prefer in this order: function parameters (most explicit) → receiver fields → package-level globals → context values. Context values are appropriate only for request-scoped, cross-cutting data (request IDs, trace IDs, auth tokens); never use context to pass ordinary function arguments.

**Context immutability** — `context.Context` values are immutable. It is safe to pass the same `ctx` to multiple sequential calls or to concurrent goroutines that share the same deadline and cancellation signal:

```go
// ✅ Same ctx to sequential and concurrent calls — always safe
g, ctx := errgroup.WithContext(ctx)
g.Go(func() error { return processA(ctx, a) })
g.Go(func() error { return processB(ctx, b) })
return g.Wait()
```

**`context.Background()` vs passing ctx** — Use `context.Background()` only at program entry points (`main`, top-level background goroutines, tests). Everywhere else, accept and forward the caller's `ctx`. Accept `ctx` even if you don't use it today — adding it later requires an API change:

```go
// ✅ Accept ctx even for "simple" operations; future-proofs the API
func LoadConfig(ctx context.Context) (*Config, error) { ... }

// ✅ Only at entry points
func main() {
    ctx := context.Background()
    if err := run(ctx); err != nil { log.Fatal(err) }
}
```

**Deriving / cancellation patterns** — always `defer cancel()` immediately after deriving a context to avoid a context leak:

```go
// Timeout — use when you own the deadline
ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
defer cancel()

// Cancellation — use when you want explicit control
ctx, cancel := context.WithCancel(ctx)
defer cancel()

// Check cancellation in long-running loops
select {
case <-ctx.Done():
    return ctx.Err()   // context.Canceled or context.DeadlineExceeded
default:
    // do work
}
```

**Use `http.NewRequestWithContext`** (never `http.NewRequest`) so the outbound request respects the caller's deadline:

```go
req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
if err != nil { return nil, fmt.Errorf("build request: %w", err) }
resp, err := http.DefaultClient.Do(req)
if err != nil { return nil, fmt.Errorf("do request: %w", err) }
defer resp.Body.Close()
```

**Typed context keys** prevent collisions between packages that store values in context. Never use a bare string or int as a key:

```go
// ✅ Unexported type scoped to this package — impossible for other packages to collide
type contextKey string

const (
    requestIDKey contextKey = "requestID"
    userIDKey    contextKey = "userID"
)

func WithRequestID(ctx context.Context, id string) context.Context {
    return context.WithValue(ctx, requestIDKey, id)
}

func RequestID(ctx context.Context) (string, bool) {
    id, ok := ctx.Value(requestIDKey).(string)
    return id, ok
}

// ❌ String key — any package can overwrite or read it
ctx = context.WithValue(ctx, "requestID", id)
```

## Generics (1.18+)

Use generics to eliminate redundant code over multiple types without sacrificing type safety. Prefer concrete types and interfaces first; reach for generics only when the same logic truly applies to multiple unrelated types.

- **Type parameters** use `[T constraint]` syntax; `any` means unconstrained.
- **`comparable`** allows `==` and `!=`; required for map keys and `Find`-style functions.
- **`constraints.Ordered`** (from `golang.org/x/exp/constraints`, or define inline) allows `<`, `>`, etc.
- **`~T`** (approximate constraint) includes all types whose underlying type is `T` — covers type aliases.
- **Union constraints** (`int | string`) restrict a parameter to a fixed set of types.
- **Type inference** works for function parameters; specify explicitly only when ambiguous.

```go
// ✅ Generic Map/Filter — remove boilerplate over typed slices
func Map[T, U any](s []T, fn func(T) U) []U {
    out := make([]U, len(s))
    for i, v := range s { out[i] = fn(v) }
    return out
}

func Filter[T any](s []T, keep func(T) bool) []T {
    out := make([]T, 0, len(s))
    for _, v := range s {
        if keep(v) { out = append(out, v) }
    }
    return out
}

// ✅ Comparable constraint — enables generic lookup
func Contains[T comparable](s []T, v T) bool {
    for _, x := range s {
        if x == v { return true }
    }
    return false
}

// ✅ Approximate constraint — works for named int types too
type Signed interface { ~int | ~int8 | ~int16 | ~int32 | ~int64 }

func Abs[T Signed](n T) T {
    if n < 0 { return -n }
    return n
}
```

**Pitfalls:**
- Avoid generic data structures (generic `Stack`, `Queue`) unless the `slices`/`maps` stdlib packages don't cover the need — the standard library covers most cases since 1.21.
- Do not use `any` as a substitute for proper interface design; `any` parameters lose type information at the call site.
- The `constraints` package (`golang.org/x/exp`) is not in stdlib — define inline constraints for simple union types to avoid adding a dependency.

> **Note:** Effective Go (https://go.dev/doc/effective_go) was written for Go's 2009 release and has not been significantly updated; use it for core language idioms, not modern ecosystem guidance (modules, generics, tooling). GC and runtime guidance applies to the standard `gc` toolchain and is not guaranteed by the language spec.

---

## Modern Go by Version

> Check the project's Go version before applying: `grep -rh "^go " --include="go.mod" . | head -1`
> Use ALL features up to and including that version; never use features from newer versions.
>
> **Note:** Version-specific behavior (especially runtime, GC, and toolchain features) should be verified against the official [Go release notes](https://go.dev/doc/devel/release) — not all changes are reflected in language specifications.

### 1.0+

- `time.Since(start)` — instead of `time.Now().Sub(start)`
- `time.Until(deadline)` (1.8+) — instead of `deadline.Sub(time.Now())`

### 1.13+

- ⭐ `errors.Is(err, target)` — instead of `err == target`; works across wrapping chains
- ⭐ `errors.As(err, &target)` — instead of type assertions on errors

### 1.18+

- ⭐ `any` — alias for `interface{}`; use everywhere
- `strings.Cut(s, sep)` / `bytes.Cut(b, sep)` — cleaner than `Index`+slice
- `atomic.Bool` / `atomic.Int64` / `atomic.Pointer[T]` — type-safe atomics instead of `atomic.StoreInt32`

### 1.19+

- `fmt.Appendf(buf, "x=%d", x)` — instead of `append(buf, []byte(fmt.Sprintf(...))...)`
- Type-safe atomics GA (`atomic.Bool`, `atomic.Int64`, `atomic.Pointer[T]`)

### 1.20+

- `strings.CutPrefix(s, "pre:")` / `CutSuffix` — cleaner prefix/suffix stripping
- `strings.Clone(s)` / `bytes.Clone(b)` — explicit string/slice copy
- `errors.Join(err1, err2)` — combine multiple errors
- `context.WithCancelCause(parent)` + `context.Cause(ctx)` — attach error to cancellation

### 1.21+

- ⭐ `min(a, b)` / `max(a, b)` builtins — instead of if/else
- `clear(m)` / `clear(s)` — delete all map entries or zero slice elements
- ⭐ `slices.Contains` / `slices.Index` / `slices.IndexFunc` — replace manual search loops
- ⭐ `slices.Sort` / `slices.SortFunc` / `slices.Max` / `slices.Min` / `slices.Reverse` / `slices.Compact` / `slices.Clone` / `slices.Clip`
- ⭐ `maps.Clone(m)` / `maps.Copy(dst, src)` / `maps.DeleteFunc` — replace manual map iteration
- `sync.OnceFunc(fn)` / `sync.OnceValue(fn)` — cleaner one-time initialization than `sync.Once`
- `context.AfterFunc(ctx, fn)` — run cleanup on cancellation
- `context.WithTimeoutCause` / `context.WithDeadlineCause`

### 1.22+

- ⭐ `for i := range n` — instead of `for i := 0; i < n; i++`
- ⭐ **Loop variable capture fixed** — each iteration now has its own variable; goroutines in loops are safe without capture workaround
- ⭐ `cmp.Or(a, b, c, "default")` — returns first non-zero value; replaces chains of `if x == "" { x = fallback }`
- `reflect.TypeFor[T]()` — instead of `reflect.TypeOf((*T)(nil)).Elem()`
- `http.ServeMux` method+path patterns: `mux.HandleFunc("GET /api/{id}", h)` + `r.PathValue("id")`

### 1.23+

- `maps.Keys(m)` / `maps.Values(m)` — now return iterators (use with `for k := range maps.Keys(m)`)
- `slices.Collect(iter)` — build slice from iterator without manual loop
- `slices.Sorted(iter)` — collect + sort in one step
- `time.Tick` — GC can now recover unreferenced tickers; `NewTicker` no longer required for GC safety

### 1.24+

- ⭐ `t.Context()` in tests — instead of `context.WithCancel(context.Background())` + `defer cancel()`
- ⭐ `omitzero` JSON tag — use instead of `omitempty` for `time.Duration`, `time.Time`, structs, slices, maps
- ⭐ `b.Loop()` in benchmarks — instead of `for i := 0; i < b.N; i++`
- `strings.SplitSeq(s, sep)` / `strings.FieldsSeq(s)` — iterator variants; use when iterating split results in for-range (avoids allocating a full slice)

### 1.25+

- ⭐ `wg.Go(fn)` on `sync.WaitGroup` — instead of `wg.Add(1)` + `go func() { defer wg.Done(); ... }()`

### 1.26+

- ⭐ `new(val)` — accepts expressions (not just types); `new(30)` → `*int`, `new(true)` → `*bool`, `new(T{})` → `*T`; replaces `x := val; &x`
- ⭐ `errors.AsType[T](err)` — instead of `errors.As(err, &target)` with a pre-declared var; returns `(T, bool)` inline

---

## Skill Loading Triggers

| Situation                                    | Load skills                                            |
| -------------------------------------------- | ------------------------------------------------------ |
| Writing any Go code                          | `standards-go` + `standards-code`                      |
| Writing Go tests, benchmarks, fuzz tests     | `standards-go-testing` + `standards-testing`           |
| Goroutines, channels, sync, context patterns | `standards-go-concurrency`                             |
| Profiling, tracing, allocation, GC tuning    | `standards-go-performance` + `standards-observability` |
| Auth, secrets, user input, crypto            | `standards-security`                                   |
| Implementing features/fixes (TDD)            | `role-developer`                                       |
| API/package/service design                   | `role-architect`                                       |
| Go PR review                                 | `role-code-review`                                     |

## Verification Checklist

- [ ] `gofmt -l .` produces no output (zero unformatted files)
- [ ] `go vet ./...` passes with no warnings
- [ ] All exported symbols have doc comments
- [ ] `go test ./...` passes
- [ ] `go test -race ./...` passes for any code touching goroutines
- [ ] Errors not silently discarded; wrapped with `%w` for context where appropriate
- [ ] Error strings are lowercase with no trailing punctuation
- [ ] No in-band error values (`-1`, `""`, `nil`); use multiple return values instead
- [ ] Every resource acquisition has a paired `defer` release
- [ ] `context.Context` is first arg to blocking/cancellable functions; not stored in structs
- [ ] No positional composite literals for multi-field structs
- [ ] Package names are lowercase, single-word, stutter-free
- [ ] Modern Go APIs used where available (check `go.mod` version; prefer `slices`/`maps`/`cmp`, `any`, `min`/`max`, `t.Context()`, `b.Loop()`)
- [ ] Generic functions constrained to the minimum required (`comparable`, `Ordered`, union, or `any`)
- [ ] Compile-time interface satisfaction checks (`var _ Iface = (*T)(nil)`) present for key types
- [ ] `go mod tidy` run; no unused dependencies
- [ ] Build tags use `//go:build` syntax (not legacy `// +build`)
- [ ] Outbound HTTP requests use `http.NewRequestWithContext` (not `http.NewRequest`)
- [ ] Context value keys use an unexported typed constant (not bare string/int)
- [ ] No custom context interface types in function signatures — always `context.Context`
- [ ] `context.Background()` used only at program entry points; ctx accepted even when not yet used
- [ ] Custom error types implement `error` and are unwrapped with `errors.As`
- [ ] Slices and maps are copied (not aliased) when received from or returned to callers at API boundaries
- [ ] Iota enums start at `iota + 1` unless zero is a meaningful default
- [ ] Time values use `time.Time` / `time.Duration`; raw-int fields include the unit in their name
- [ ] All marshaled structs carry explicit `json:` / `yaml:` field tags
- [ ] No mutable package-level globals; dependencies are injected
- [ ] Exported structs do not embed types that leak API surface; named fields + forwarding methods used instead
- [ ] Keys, tokens, and IDs are generated with `crypto/rand`, never `math/rand`

Base directory for this skill: file:///Users/pecigonzalo/.config/opencode/skills/standards-go
Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.
Note: file list is sampled.
