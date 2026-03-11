---
name: standards-go-concurrency
description: MUST load when writing goroutines, channels, or sync primitives in Go; SHOULD load for concurrency code reviews. Provides safe concurrency patterns, leak prevention, and race-detection checklists.
license: MIT
compatibility: opencode
metadata:
  role: standards
  domain: go-concurrency
  priority: high
---

# Go Concurrency Standards

**Provides:** Safe goroutine lifecycle management, context-first cancellation, channel ownership rules, mutex discipline, leak prevention patterns, and race-detection checklists.

**Primary references:** Effective Go, Go CodeReviewComments, and major Go style guides.

## Quick Reference

**Golden Rule**: Own your goroutines — every goroutine you start must have a clear owner, a stop mechanism, and a join point.

**✅ DO:**
- Pass `ctx` as the first parameter to every blocking function
- Use `errgroup.WithContext` for fan-out parallelism
- Close channels only from the sender; use directional channel types
- `defer ticker.Stop()` immediately after `time.NewTicker`
- Use `sync.WaitGroup` or `errgroup` to join all spawned goroutines
- Keep mutex critical sections minimal — no I/O under a lock
- Prefer `time.NewTimer` over `time.After` inside loops
- Prefer synchronous APIs — let the caller add the goroutine
- Use named `mu sync.Mutex` field, never embed a mutex in a struct
- Document thread-safety when read-vs-write behaviour is non-obvious

**❌ DON'T:**
- Fire-and-forget goroutines in request handlers or libraries
- Close a channel from a receiver or from multiple goroutines
- Store a `context.Context` in a struct field
- Derive a new goroutine's context from `context.Background()` instead of the parent
- Use `sync.RWMutex` without benchmark evidence of read-heavy contention
- Use `time.After` in loops (allocates a new timer each iteration)
- Copy a struct that embeds `sync.Mutex` or `sync.RWMutex`
- Spawn goroutines in `init()` — use a lifecycle-managed object instead
- Use channel buffers > 1 without documented justification

**Key Commands:**
```bash
go test -race ./...                      # detect data races
go test -run TestX -count=100 ./pkg      # stress-test concurrency
go test -timeout 30s ./...               # catch goroutine leaks via timeout
# Goroutine profile snapshot:
go tool pprof -http=:0 http://localhost:6060/debug/pprof/goroutine
go test -count=1 -run TestWorkerPool -v ./...  # verify pool goroutine count
```

---

## Context-First Cancellation

Propagate deadlines and cancellation signals through the call graph so any blocking operation can be interrupted cleanly.

- Accept `ctx context.Context` as the first parameter of every function that may block.
- In loops, add a `select` arm on `ctx.Done()` alongside the work arm.
- Derive child contexts with `context.WithTimeout` / `context.WithCancel` from the caller's ctx, never from `context.Background()`.
- Do not store ctx in struct fields; pass it through the call chain instead.

```go
// ✅ Correct: context threaded through loop
func process(ctx context.Context, jobs <-chan Job) error {
    for {
        select {
        case <-ctx.Done():
            return ctx.Err()
        case j, ok := <-jobs:
            if !ok {
                return nil
            }
            if err := handle(ctx, j); err != nil {
                return err
            }
        }
    }
}
```

Forgetting `select ctx.Done()` in tight inner loops; shadowing `ctx` with a new variable inside the loop body; deriving from `context.Background()` instead of the parent.

Unit tests that cancel ctx mid-flight and assert the function returns promptly; `go test -race ./...`.

---

## Goroutine Ownership & Lifecycle

Every goroutine must have a single owner responsible for starting, stopping, and joining it.

- Assign ownership at the call site that calls `go func(...)`.
- Provide a stop mechanism: a cancellable `ctx` or a dedicated done/quit channel.
- Join with `sync.WaitGroup` or `errgroup` before the owner returns or exits.
- Stop `time.Ticker` with `defer ticker.Stop()` in the owning goroutine.

```go
// ✅ Correct: owned, stoppable, joined
func startWorker(ctx context.Context, wg *sync.WaitGroup, in <-chan Item) {
    wg.Add(1)
    go func() {
        defer wg.Done()
        for {
            select {
            case <-ctx.Done():
                return
            case item, ok := <-in:
                if !ok {
                    return
                }
                process(item)
            }
        }
    }()
}
```

- **No goroutines in `init()`:** `init()` must not spawn goroutines — callers have no way to stop or wait for them. Instead, expose a lifecycle-managed object with an explicit `Start`/`Shutdown` method:

Avoid goroutines in `init()`; use explicit lifecycle (`Start`/`Shutdown`) instead.

- **Prefer synchronous over async APIs:** Write functions synchronously by default — the caller can always wrap the call in a goroutine. Async APIs force concurrency on callers, making lifetimes harder to reason about and tests harder to write.

Prefer synchronous APIs in libraries; let callers add goroutines.

Fire-and-forget goroutines inside HTTP handlers that outlive the request; closing channels from multiple goroutines causing panics; leaking `time.Ticker` by only calling `Stop` without draining.

pprof goroutine profile stays bounded under load; tests include cancellation and timeout paths (see `standards-testing`).

---

## errgroup for Fan-Out / Fan-In

Use `golang.org/x/sync/errgroup` when launching parallel work where the first error should cancel everything else.

- Create with `errgroup.WithContext(parentCtx)` so the derived ctx is cancelled on the first error.
- Pass the group's ctx into every worker so they can exit early.
- Collect results into pre-allocated slices (index by worker ID) to avoid data races on shared accumulators.
- Bound parallelism with `g.SetLimit(n)` (Go 1.x/x/sync v0.1+) to cap the number of concurrent goroutines in the group — prevents unbounded goroutine creation when iterating over large inputs.

```go
// ✅ Correct: workers respect cancellation; no shared mutable state
g, ctx := errgroup.WithContext(parentCtx)
results := make([]Result, len(inputs))

for i, inp := range inputs {
    i, inp := i, inp // capture loop vars
    g.Go(func() error {
        r, err := fetch(ctx, inp)
        if err != nil {
            return err
        }
        results[i] = r
        return nil
    })
}
if err := g.Wait(); err != nil {
    return nil, err
}
```

Use `g.SetLimit(n)` for large/unbounded input sets.

Workers that ignore the group's ctx and never check `ctx.Done()`; appending to a shared slice without synchronization (data race).

`go test -race ./...`; deterministic tests using fakes or in-process stubs (see `standards-testing`).

---

## Fan-Out / Fan-In

Use fan-out/fan-in when parallel throughput is needed without shared mutable accumulators. Keep it simple: workers read a shared input channel, merge closes output only after all workers finish, and every goroutine respects `ctx.Done()`.

---

## Channel Ownership Rules

Channels are owned by the sender — only the sender may close a channel.

- The goroutine that creates and writes to a channel is its owner and is the only one that closes it.
- Use directional types at function boundaries: `chan<- T` for producers, `<-chan T` for consumers.
- A nil channel blocks forever on send and receive — use this intentionally to disable a `select` arm.
- **Buffer sizing rule of thumb:** default to unbuffered (`0`) or size `1`. Any other size should be documented and justified.

One owner should create/write/close each channel; receivers should not close channels.

Multiple goroutines closing the same channel (panic); buffered channels that grow unboundedly under load.

Tests exercise the closed-channel path; `select` loops always have a ctx cancellation arm to prevent deadlock.

---

## Mutex Discipline

Use mutexes only when shared mutable state cannot be confined to a single goroutine.

- Keep critical sections as small as possible — compute outside the lock, hold only for the read/write.
- Never perform I/O (network, disk, logging) while holding a lock.
- Document lock ordering when multiple mutexes are acquired together.
- Prefer `sync.Mutex` by default; only upgrade to `sync.RWMutex` after benchmark evidence of a read-heavy bottleneck.
- **Do not embed mutexes in structs** — embedding promotes `Lock`/`Unlock` to the public API. Use a named field `mu sync.Mutex` so the mutex stays an implementation detail:

Use named mutex fields (`mu sync.Mutex`) instead of embedding.

  - Never copy a struct that embeds `sync.Mutex` — pass by pointer.

Keep critical sections tiny and avoid I/O while holding locks.

Lock inversion (acquiring locks in different orders across goroutines causes deadlock); copying mutex-embedding structs by value; using `RWMutex.RLock` for write operations.

`go test -race ./...`; contention benchmarks (`go test -bench . -benchmem`); mutex profile (`/debug/pprof/mutex`) when a hot path is suspected (see `standards-observability`).

---

## sync.Once — One-Time Initialization

Use `sync.Once` to perform an action exactly once across all goroutines, regardless of how many call it concurrently.

- Embed `sync.Once` in the owning struct; call `once.Do(fn)` where `fn` contains the initialization.
- In Go 1.21+, prefer `sync.OnceFunc(fn)` (returns a no-arg func you call repeatedly) or `sync.OnceValue(fn)` (returns a func that returns the value) — they are cleaner and cache the result automatically.
- `Do` panics if `fn` panics; the panic propagates to all callers and the initialization is not retried.

- Calling `once.Do` with a different function on subsequent calls has no effect — only the first call's function runs.
- Holding a lock while calling `once.Do` a second time in the same goroutine deadlocks.
- Storing computed results requires an explicit field; use `sync.OnceValue` to avoid the boilerplate.

Concurrent goroutines all receive the same initialized value; `go test -race ./...` passes.

Prefer `sync.OnceValue`/`sync.OnceFunc` (Go 1.21+) for cleaner one-time initialization.

---

## Avoiding Common Leaks

Leaked goroutines, timers, and unclosed resources accumulate silently and exhaust memory or file descriptors.

- `time.Ticker`: `ticker := time.NewTicker(d); defer ticker.Stop()` immediately in the same function.
- `time.After` in loops: replace with `time.NewTimer` + `defer timer.Stop()` or reset the timer; `time.After` allocates a new `Timer` every iteration.
- HTTP response bodies: `defer resp.Body.Close()` after checking the error from `http.Do`.
- `select` loops must always include a `ctx.Done()` or done-channel arm — a goroutine blocked on a send to a channel no one reads is a leak.

Avoid `time.After` in loops; reuse timers to prevent per-iteration allocations/leaks.

Forgetting `defer resp.Body.Close()` when an error is returned before the defer; goroutines parked on a send to a full unbuffered channel when the receiver has exited.

Assert goroutine count is bounded in tests (capture `runtime.NumGoroutine()` before/after); use `go.uber.org/goleak` in tests to detect leaked goroutines automatically; take `runtime/pprof` goroutine snapshots under load (see `standards-observability`).

Use `goleak` in concurrency-heavy test suites.

---

## Worker Pool

Use worker pools to cap concurrency and apply backpressure; keep queue size and shutdown semantics explicit.

---

## Semaphore

Use channel-based semaphores for simple bounded concurrency when a full worker pool is unnecessary.

---

## Rate Limiting

Use `golang.org/x/time/rate` with per-tenant/per-key scope when fairness matters. Always handle `limiter.Wait(ctx)` errors.

---

## Pipeline

For staged stream processing, make every stage context-aware, close outputs deterministically, and avoid hidden shared state.

---

## Documenting Thread-Safety

Go callers assume read-only operations are concurrency-safe and mutating operations are not. Document concurrency behaviour when this assumption doesn't hold:

- **Read-mutating mismatch** — e.g., a `Lookup` that silently mutates LRU state is not safe for concurrent calls; say so.
- **API provides synchronization** — e.g., a thread-safe client or cache; document that concurrent use is safe.
- **Interface implementations** — if an interface requires concurrent use, state it in the type or interface doc comment.

```go
// Cache is safe for concurrent use by multiple goroutines.
type Cache struct { ... }

// Lookup returns the value for key, updating recency order.
// It is NOT safe to call concurrently with Set.
func (c *Cache) Lookup(key string) (string, bool) { ... }
```

---

## Skill Loading Triggers

| Situation | Also load |
|---|---|
| Reviewing concurrency code | `role-code-review` |
| Tracing goroutine latency | `standards-observability` |
| Writing concurrency tests | `standards-go-testing` |

## Verification Checklist

> For baseline formatting, vet, and go test checks see `standards-go`.

- [ ] ctx passed as first parameter to all blocking functions; never stored in struct fields
- [ ] Every goroutine has an explicit owner, stop mechanism, and is joined (WaitGroup or errgroup)
- [ ] No goroutines spawned in `init()` — lifecycle-managed object used instead
- [ ] Only senders close channels; directional channel types used at function boundaries
- [ ] No I/O held under mutex lock; mutex is a named field (`mu sync.Mutex`), not embedded
- [ ] time.Ticker always deferred Stop(); time.After not used inside loops
- [ ] HTTP response bodies always closed after error check
- [ ] go test -race passes with no warnings
- [ ] go.uber.org/goleak used in test suite to catch goroutine leaks
- [ ] Channel buffers are 0 or 1 by default; larger sizes are documented
- [ ] errgroup workers respect group ctx; SetLimit used when input can grow unbounded
- [ ] sync.Once / OnceValue / OnceFunc used for one-time initialization where applicable

Note: file list is sampled.
