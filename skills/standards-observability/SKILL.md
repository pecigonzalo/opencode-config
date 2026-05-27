---
name: standards-observability
description: MUST load for logging, metrics, error tracking, or performance monitoring; SHOULD load for debugging strategies or system health design. Provides structured logging, telemetry, and visibility checklists.
license: MIT
compatibility: opencode
metadata:
  role: standards
  domain: observability
  priority: high
---

# Observability standards

**Provides:** Structured logging patterns, metrics design, error tracking, performance monitoring, and debugging strategies.

## Quick reference

**Core philosophy**: Observable, debuggable, measurable
**Golden rule**: If you can't see it in production, you can't fix it

**Critical patterns** (use these):

- ✅ Structured logging with bounded, non-sensitive context
- ✅ Meaningful error messages with safe diagnostic details
- ✅ Business SLIs/SLOs and metrics tied to user outcomes
- ✅ Low-cardinality metric labels and normalized route names
- ✅ OpenTelemetry or W3C trace context across service boundaries
- ✅ Alerts on user-impacting symptoms with owners and runbooks

**Anti-patterns** (avoid these):

- ❌ Silent failures with no logs, metrics, or traces
- ❌ Generic error messages such as "Error" or "Failed"
- ❌ Raw PII, secrets, tokens, or payloads in logs
- ❌ Logging everything until noise hides signals
- ❌ High-cardinality labels such as raw URLs, IDs, or emails
- ❌ Shared mutable logger context across concurrent requests

---

## Logging standards

### Structured logging

**✅ DO: Use structured (JSON) logging**
```javascript
// ✅ Good - Structured, contextual, and safe for routine logs
const start = performance.now();

logger.info({
  event: 'user_created',
  userId: user.id,
  emailDomain: getEmailDomain(user.email),
  timestamp: new Date().toISOString(),
  durationMs: performance.now() - start,
  environment: process.env.NODE_ENV
});

// ✅ Good - Template with bounded context
logger.info('User created', {
  userId: user.id,
  source: 'signup_form',
  plan: user.plan
});
```

Only log data allowed by the service data-classification policy. Redact, hash, or omit raw PII such as emails, phone numbers, tokens, payment data, and request payloads.

**❌ DON'T: Use free-form text logging**
```javascript
// ❌ Bad - No context, unstructured
console.log('Created user');

// ❌ Bad - Unstructured concatenation
logger.log('User ' + user.id + ' was created at ' + new Date());

// ❌ Bad - No actionable information
logger.error('Something went wrong');
```

### Log levels

Use appropriate log levels to control noise:

- **ERROR**: Actionable errors requiring investigation or manual intervention
  ```javascript
  logger.error('Database connection failed', {
    database: 'users-db',
    errorMessage: sanitize(error.message),
    retry: 3,
    nextRetry: '5s'
  });
  ```

- **WARN**: Degraded performance, approaching limits, recoverable issues
  ```javascript
  logger.warn('Cache miss rate high', {
    hitRate: 0.45,
    threshold: 0.8,
    action: 'check_cache_configuration'
  });
  ```

- **INFO**: Important business events (user actions, deployments, config changes)
  ```javascript
  logger.info('Deployment started', {
    version: '1.2.3',
    environment: 'production',
    deployedBy: 'ci/cd'
  });
  ```

- **DEBUG**: Detailed information for troubleshooting (not in production by default)
  ```javascript
  logger.debug('Processing payment', {
    orderId: '12345',
    amount: 99.99,
    processor: 'stripe'
  });
  ```

### Log context and correlation

**✅ DO: Include correlation IDs for request tracing**
```javascript
// Middleware: attach a request-scoped child logger.
function requestContextMiddleware(req, res, next) {
  const inboundRequestId = req.headers['x-request-id'];
  const requestId = isValidRequestId(inboundRequestId)
    ? inboundRequestId
    : generateId();

  req.log = logger.child({ requestId, userId: req.user?.id });
  res.setHeader('x-request-id', requestId);
  next();
}

// In application code - requestId is included by the child logger.
req.log.info('Processing order', { orderId: '123' });
// Output includes: { requestId: 'abc123', userId: 'user456', orderId: '123' }
```

Do not store request context in shared mutable logger state. Use child loggers, `AsyncLocalStorage`, or OpenTelemetry context propagation so concurrent requests cannot leak `userId`, `requestId`, or trace context.

**✅ DO: Include relevant context for debugging**
```javascript
logger.error('Payment processing failed', {
  orderId: order.id,
  customerId: customer.id,
  amount: order.total,
  paymentGateway: 'stripe',
  errorCode: error.code,
  errorMessage: sanitize(error.message),
  retryable: error.retryable,
  attempt: attempt,
  maxAttempts: MAX_RETRIES
});
```

### What to log

**✅ DO log:**
- User actions (login, signup, purchase, upload)
- State transitions (order created → paid → shipped)
- Errors with context (not just the error, but what was being done)
- Performance thresholds (slow queries, timeouts)
- Configuration changes and deployments
- Security events (auth failures, permission denials)

**❌ DON'T log:**
- Sensitive data (passwords, API keys, PII without redaction)
- Full request/response payloads unless explicitly sampled and redacted
- Internal implementation details (loop counters, temp variables)
- Every function call (use DEBUG level, disable in production)
- Duplicate information (already in metrics)
- Unbounded values that create noisy searches or retention problems

---

## Error tracking standards

### Structured error messages

**✅ DO: Provide actionable error context**
```javascript
// ✅ Good - Clear, actionable, contextual
class PaymentError extends Error {
  constructor(message, context) {
    super(message);
    this.name = 'PaymentError';
    this.code = context.code;
    this.orderId = context.orderId;
    this.retryable = context.retryable;
    this.timestamp = new Date();
  }
}

throw new PaymentError(
  'Card declined: Insufficient funds',
  {
    code: 'card_declined',
    orderId: '12345',
    retryable: true
  }
);
```

**❌ DON'T: Use vague error messages**
```javascript
// ❌ Bad - No context
throw new Error('Failed');

// ❌ Bad - Implementation detail, not user action
throw new Error('JSON.parse failed');

// ❌ Bad - No code or recovery info
throw new Error('Database error');
```

### Error handling pattern

```javascript
// ✅ Good - Clear separation of concerns
async function processPayment(order) {
  try {
    const result = await paymentGateway.charge(order);

    logger.info('Payment successful', {
      orderId: order.id,
      amount: order.total,
      transactionId: result.id
    });

    return { success: true, transactionId: result.id };

  } catch (error) {
    // Categorize error for monitoring.
    const isRetryable = error.code === 'network_error' || error.code === 'timeout';
    const isFatal = error.code === 'card_declined' || error.code === 'invalid_card';

    logger.error('Payment failed', {
      orderId: order.id,
      amount: order.total,
      errorCode: error.code,
      errorMessage: sanitize(error.message),
      isRetryable,
      isFatal,
      stack: shouldIncludeStack() ? redact(error.stack) : undefined
    });

    // At boundaries, return structured errors; inside services, wrap or rethrow when callers need retry/recovery control.
    return {
      success: false,
      code: error.code,
      message: userSafeMessage(error),
      retryable: isRetryable,
      fatal: isFatal
    };
  }
}
```

---

## Metrics standards

### Business metrics

Track metrics that indicate user value and business health:

**✅ DO: Track business outcomes**
```javascript
// User engagement
metrics.increment('users.signup', 1);
metrics.increment('users.login', 1);
metrics.increment('orders.created', 1);
metrics.gauge('active_users', activeUserCount);

// Conversion and quality events; derive rates in the metrics backend.
metrics.increment('checkout.started', 1);
metrics.increment('checkout.completed', 1);
metrics.increment('payments.succeeded', 1);
metrics.increment('payments.failed', 1, { reason: 'card_declined' });
metrics.increment('api.requests', 1, { statusClass: '2xx' });
metrics.increment('api.requests', 1, { statusClass: '5xx' });
```

**❌ DON'T: Track only technical metrics**
```javascript
// ❌ Not actionable
metrics.increment('function_calls');
metrics.increment('loop_iterations');

// ❌ Too granular
metrics.increment('variable_assignments');
```

### Performance metrics

**✅ DO: Measure operations that affect users**
```javascript
// ✅ Good - Meaningful performance metrics
const timer = metrics.startTimer('database.query.duration');
const results = await db.query('SELECT * FROM users WHERE active = true');
timer.end({ operation: 'select_active_users' });

// ✅ Good - API response times by normalized endpoint
const apiTimer = metrics.startTimer('api.request.duration');
await handleRequest();
apiTimer.end({
  method: req.method,
  route: routeTemplate(req),
  status: res.statusCode
});

// ✅ Good - Queue depth and processing time
metrics.gauge('job_queue.depth', queue.length);
const jobTimer = metrics.startTimer('job.processing.duration');
await processJob(job);
jobTimer.end({ jobType: job.type });
```

### Metric guidelines

- **Counter**: Monotonic cumulative values (requests, errors, conversions)
- **Gauge**: Current value (queue length, memory, active connections)
- **Histogram**: Distribution (response times, payload sizes)
- **Summary**: Client-side quantiles when the backend cannot aggregate histograms

Keep metric label values low-cardinality and bounded. Use route templates, status classes, error codes, and enum-like values. Do not tag metrics with raw URLs, emails, UUIDs, payload values, stack traces, or unconstrained user input.

**Pattern:**
```javascript
// ✅ Good - Clear metric names with tags
metrics.timing('api.request', duration, {
  method: 'POST',
  route: '/api/users',
  status: 201
});

metrics.gauge('cache.memory', bytes, {
  cache: 'user_sessions'
});

metrics.increment('errors', 1, {
  type: 'validation_error',
  field: 'email'
});
```

---

## Distributed tracing

### Request correlation

**✅ DO: Prefer OpenTelemetry and W3C Trace Context**

Use framework auto-instrumentation first. When manual propagation is needed, inject and extract W3C `traceparent`/`tracestate` headers rather than inventing custom trace headers.

```javascript
// 1. Entry point: extract W3C trace context with OpenTelemetry.
app.use(otelHttpMiddleware());

// 2. Service calls: propagate the active trace context.
async function callUserService(userId) {
  const headers = {};
  otel.propagation.inject(otel.context.active(), headers);

  const result = await fetch('http://user-service/users/' + userId, {
    headers
  });
  return result;
}

// 3. Logs include trace context from the active span.
const span = otel.trace.getActiveSpan();
logger.info('User retrieved', {
  traceId: span?.spanContext().traceId,
  spanId: span?.spanContext().spanId,
  userId,
  durationMs
});
```

If custom `x-request-id` or `x-trace-id` headers are required for legacy systems, validate length and format before echoing or storing them. Regenerate invalid IDs to avoid log injection and cardinality problems.

---

## Performance profiling and checklists

### Profiling guidance

- Use distributed traces to find slow spans before adding logs.
- Capture CPU, heap, and allocation profiles for reproducible hotspots.
- Prefer sampling profiles in production over always-on verbose diagnostics.
- Correlate profiles with deploy versions, feature flags, and traffic shape.
- Redact heap dumps and query samples before sharing or storing them.

### Production observability checklist

- [ ] All errors logged with context (not silent failures)
- [ ] Business metrics tracked (not just technical metrics)
- [ ] Request correlation/tracing (can follow requests across services)
- [ ] Performance thresholds monitored (slow queries, timeouts)
- [ ] Log levels appropriate (no over-logging in production)
- [ ] Sensitive data redacted from logs
- [ ] Error messages actionable (help debugging/fixing)
- [ ] Metrics have meaningful names and tags
- [ ] Alerts configured on key metrics
- [ ] Dashboards show user-visible metrics

### Debugging checklist

- [ ] Logs contain request IDs for correlation
- [ ] Error stack traces preserved (not swallowed)
- [ ] Contextual data included (what was being done when error occurred)
- [ ] Log level appropriate to severity
- [ ] Metrics show anomalies (unusual patterns)
- [ ] Performance profiling tools accessible (flame graphs, traces)
- [ ] Database query logs available (with execution time)

---

## Alerts and monitoring

### Alert guidelines

Alerts need a user-impacting symptom, threshold, time window, owner, and runbook. Prefer SLO burn-rate alerts and symptoms over raw component metrics.

**✅ DO: Alert on problems, not noise**
```javascript
// ✅ Good - Alert on user-impacting issues
{
  name: 'High 5xx Error Rate',
  condition: '5xx_error_rate > 0.05 for 5m',
  severity: 'critical',
  owner: 'platform-oncall',
  action: 'page_oncall',
  runbook: 'https://runbooks.example.com/api-5xx',
  dashboard: 'https://dashboards.example.com/api-health'
}

{
  name: 'Payment Processing Slow',
  condition: 'payment_processing_time_p99 > 5000ms for 10m',
  severity: 'warning',
  owner: 'payments-team',
  action: 'notify_team',
  runbook: 'https://runbooks.example.com/payment-latency'
}

// ✅ Good - Alert on SLO burn rate
{
  name: 'Availability SLO Burn Rate',
  condition: 'availability_error_budget_burn_rate > 14 for 10m',
  severity: 'critical',
  owner: 'service-owner',
  action: 'page_oncall',
  runbook: 'https://runbooks.example.com/slo-burn-rate'
}
```

**❌ DON'T: Alert on every metric**
```javascript
// ❌ Bad - Creates alert fatigue
{
  condition: 'requests_total > 0',
  action: 'page_oncall'
}

// ❌ Bad - Not actionable
{
  condition: 'some_metric_changed',
  action: 'notify_team'
}
```

---

## Compact integration example

```javascript
app.use((req, res, next) => {
  req.log = logger.child({ requestId: validatedRequestId(req), userId: req.user?.id });
  const route = routeTemplate(req);
  const timer = metrics.startTimer('api.request.duration');

  res.on('finish', () => {
    const statusClass = `${Math.trunc(res.statusCode / 100)}xx`;
    timer.end({ method: req.method, route, statusClass });
    metrics.increment('api.requests', 1, { route, statusClass });
  });

  next();
});

try {
  req.log.info('Order created', { orderId, customerId });
  metrics.increment('orders.created', 1);
} catch (error) {
  req.log.error('Order creation failed', {
    customerId,
    errorCode: error.code,
    errorMessage: sanitize(error.message),
    stack: shouldIncludeStack() ? redact(error.stack) : undefined
  });
  metrics.increment('order.creation.errors', 1, { code: error.code ?? 'unknown' });
}
```

---

## See also

- [OpenTelemetry](https://opentelemetry.io/docs/)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [Prometheus naming](https://prometheus.io/docs/practices/naming/)
- [standards-security](../standards-security/SKILL.md)
