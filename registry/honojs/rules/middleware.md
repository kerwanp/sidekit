---
parent: honojs
name: Middleware
description: Middleware creation, ordering, and usage
type: rule
---

## Middleware

### Rules

- Middleware MUST be functions that accept `(c, next)` parameters
- Middleware MUST call `await next()` to continue the chain
- Global middleware MUST be registered using `app.use()`
- Route-specific middleware MUST be registered before the route handler
- Middleware execution follows an "onion" model (before and after handler)
- Custom middleware MUST be placed in `src/middleware/` directory
- Built-in middleware SHOULD be preferred over custom implementations
- Middleware MUST handle errors appropriately
- Middleware order matters - register in the correct sequence

### Built-in Middleware

```typescript
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { compress } from "hono/compress";
import { etag } from "hono/etag";
import { secureHeaders } from "hono/secure-headers";
import { csrf } from "hono/csrf";
import { basicAuth } from "hono/basic-auth";
import { bearerAuth } from "hono/bearer-auth";
import { timing } from "hono/timing";
import { cache } from "hono/cache";

const app = new Hono();

// Logging
app.use("*", logger());

// CORS
app.use(
  "*",
  cors({
    origin: ["https://example.com"],
    allowMethods: ["GET", "POST", "PUT", "DELETE"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

// Compression
app.use("*", compress());

// ETag
app.use("*", etag());

// Security headers
app.use("*", secureHeaders());

// CSRF protection
app.use("*", csrf());

// Basic authentication
app.use(
  "/admin/*",
  basicAuth({
    username: "admin",
    password: "secret",
  }),
);

// Bearer token authentication
app.use(
  "/api/*",
  bearerAuth({
    token: "your-secret-token",
  }),
);

// Timing
app.use("*", timing());

// Cache
app.get("/cached", cache({ cacheName: "my-cache" }), (c) => {
  return c.json({ cached: true });
});
```

### Custom Middleware

#### Response Time Middleware

```typescript
// src/middleware/responseTime.ts
import { Context, Next } from "hono";

export const responseTime = async (c: Context, next: Next) => {
  const start = performance.now();
  await next();
  const end = performance.now();
  c.res.headers.set("X-Response-Time", `${end - start}ms`);
};

// Usage
app.use("*", responseTime);
```

#### Request ID Middleware

```typescript
// src/middleware/requestId.ts
import { Context, Next } from "hono";
import { randomUUID } from "crypto";

export const requestId = async (c: Context, next: Next) => {
  const id = c.req.header("X-Request-ID") || randomUUID();
  c.set("requestId", id);
  await next();
  c.res.headers.set("X-Request-ID", id);
};

// Usage
app.use("*", requestId);
app.get("/test", (c) => {
  const id = c.get("requestId");
  return c.json({ requestId: id });
});
```

#### Error Handling Middleware

```typescript
// src/middleware/errorHandler.ts
import { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";

export const errorHandler = async (c: Context, next: Next) => {
  try {
    await next();
  } catch (err) {
    if (err instanceof HTTPException) {
      return err.getResponse();
    }

    console.error("Unhandled error:", err);
    return c.json({ error: "Internal Server Error" }, 500);
  }
};

// Usage (register as first middleware)
app.use("*", errorHandler);
```

#### Rate Limiting Middleware

```typescript
// src/middleware/rateLimit.ts
import { Context, Next } from "hono";

const requests = new Map<string, number[]>();

export const rateLimit = (max: number, windowMs: number) => {
  return async (c: Context, next: Next) => {
    const ip = c.req.header("x-forwarded-for") || "unknown";
    const now = Date.now();
    const windowStart = now - windowMs;

    const userRequests = requests.get(ip) || [];
    const recentRequests = userRequests.filter((time) => time > windowStart);

    if (recentRequests.length >= max) {
      return c.json({ error: "Too many requests" }, 429);
    }

    recentRequests.push(now);
    requests.set(ip, recentRequests);

    await next();
  };
};

// Usage
app.use("/api/*", rateLimit(100, 60 * 1000)); // 100 requests per minute
```

### Middleware Factory Pattern

```typescript
// src/middleware/factory.ts
import { createFactory } from "hono/factory";

const factory = createFactory();

// Create reusable middleware
export const authMiddleware = factory.createMiddleware(async (c, next) => {
  const token = c.req.header("Authorization");
  if (!token) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }
  // Validate token
  c.set("userId", "user123");
  await next();
});

// Create handlers with middleware
export const protectedHandler = factory.createHandlers(authMiddleware, (c) => {
  const userId = c.get("userId");
  return c.json({ userId });
});

// Usage
app.get("/protected", ...protectedHandler);
```

### Conditional Middleware

```typescript
// Apply middleware conditionally
app.use("*", async (c, next) => {
  if (c.req.path.startsWith("/public")) {
    return next(); // Skip middleware for public routes
  }
  // Apply middleware logic
  await next();
});

// Environment-based middleware
if (process.env.NODE_ENV === "development") {
  app.use("*", logger());
}
```

### Middleware Composition

```typescript
// Compose multiple middleware
const composed = compose(cors(), logger(), compress());

app.use("*", composed);

// Or chain them
app.use("*", cors()).use("*", logger()).use("*", compress());
```

### Sources

- [Middleware Documentation](https://hono.dev/docs/concepts/middleware)
- [Built-in Middleware](https://hono.dev/docs/middleware/builtin)
- [Custom Middleware Guide](https://hono.dev/docs/guides/middleware)
