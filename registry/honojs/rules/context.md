---
parent: honojs
name: Context
description: Context handling and custom variables
type: rule
---

## Context

### Rules

- Context variables MUST be typed using TypeScript generics
- Context variables SHOULD be set in middleware before being used in handlers
- Context variable names MUST be descriptive and consistent
- Context variables MUST NOT contain sensitive information that could leak
- Context cleanup SHOULD be handled appropriately for long-running requests
- Context variables SHOULD be documented for team understanding
- Context inheritance MUST be properly managed in nested applications

### Basic Context Usage

```typescript
// src/types/context.ts
export type Variables = {
  userId: string;
  user: User;
  requestId: string;
  startTime: number;
  db: Database;
  logger: Logger;
  ipAddress: string;
  userAgent: string;
};

export type Bindings = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  REDIS_URL: string;
  API_KEY: string;
};

// src/app.ts
import { Hono } from "hono";
import type { Variables, Bindings } from "./types/context";

const app = new Hono<{
  Variables: Variables;
  Bindings: Bindings;
}>();

// Setting context variables in middleware
app.use("*", async (c, next) => {
  // Request tracking
  c.set("requestId", crypto.randomUUID());
  c.set("startTime", Date.now());

  // Extract client info
  c.set("ipAddress", c.req.header("x-forwarded-for") || "unknown");
  c.set("userAgent", c.req.header("user-agent") || "unknown");

  await next();
});

// Using context variables in handlers
app.get("/profile", (c) => {
  const userId = c.get("userId"); // Fully typed
  const user = c.get("user"); // Fully typed
  const requestId = c.get("requestId");

  return c.json({
    user,
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
    },
  });
});
```

### Request Lifecycle Context

```typescript
// src/middleware/request-context.ts
import { Context, Next } from "hono";
import { randomUUID } from "crypto";

export interface RequestContext {
  id: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  method: string;
  path: string;
  statusCode?: number;
  userAgent: string;
  ipAddress: string;
  userId?: string;
}

export const requestContextMiddleware = async (c: Context, next: Next) => {
  const requestContext: RequestContext = {
    id: randomUUID(),
    startTime: Date.now(),
    method: c.req.method,
    path: c.req.path,
    userAgent: c.req.header("user-agent") || "unknown",
    ipAddress:
      c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown",
  };

  c.set("requestContext", requestContext);
  c.set("requestId", requestContext.id);

  // Add request ID to response headers
  c.res.headers.set("X-Request-ID", requestContext.id);

  try {
    await next();

    // Update context after request
    requestContext.endTime = Date.now();
    requestContext.duration = requestContext.endTime - requestContext.startTime;
    requestContext.statusCode = c.res.status;
  } catch (error) {
    requestContext.endTime = Date.now();
    requestContext.duration = requestContext.endTime - requestContext.startTime;
    requestContext.statusCode =
      error instanceof HTTPException ? error.status : 500;

    throw error;
  }
};
```

### Database Context

```typescript
// src/middleware/database-context.ts
import { Context, Next } from "hono";
import { Pool } from "pg";
import { createDatabase } from "../lib/database";

export const databaseContextMiddleware = async (c: Context, next: Next) => {
  const db = createDatabase(c.env.DATABASE_URL);
  c.set("db", db);

  try {
    await next();
  } finally {
    // Cleanup database connections
    await db.close();
  }
};

// Usage in handlers
app.get("/users", async (c) => {
  const db = c.get("db");
  const users = await db.query("SELECT * FROM users");
  return c.json({ users });
});
```

### User Context with Caching

```typescript
// src/middleware/user-context.ts
import { Context, Next } from "hono";
import { verifyAccessToken } from "../lib/auth";
import { getUserById } from "../lib/user";

const userCache = new Map<string, { user: User; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const userContextMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header("Authorization");

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);

    try {
      const payload = await verifyAccessToken(token);
      const userId = payload.sub;

      // Check cache first
      const cached = userCache.get(userId);
      if (cached && cached.expires > Date.now()) {
        c.set("userId", userId);
        c.set("user", cached.user);
        c.set("userRole", cached.user.role);
      } else {
        // Fetch from database
        const user = await getUserById(userId);
        if (user) {
          // Cache the user
          userCache.set(userId, {
            user,
            expires: Date.now() + CACHE_TTL,
          });

          c.set("userId", userId);
          c.set("user", user);
          c.set("userRole", user.role);
        }
      }
    } catch (error) {
      // Invalid token - continue without user context
    }
  }

  await next();
};

// Clear cache entry when user is updated
export function invalidateUserCache(userId: string) {
  userCache.delete(userId);
}
```

### Feature Flags Context

```typescript
// src/middleware/feature-flags.ts
import { Context, Next } from "hono";

interface FeatureFlags {
  newUI: boolean;
  betaFeatures: boolean;
  advancedAnalytics: boolean;
  experimentalAPI: boolean;
}

export const featureFlagsMiddleware = async (c: Context, next: Next) => {
  const userId = c.get("userId");
  const userRole = c.get("userRole");

  // Determine feature flags based on user
  const flags: FeatureFlags = {
    newUI: await isFeatureEnabled("newUI", userId, userRole),
    betaFeatures: userRole === "admin" || userRole === "beta",
    advancedAnalytics: userRole === "admin",
    experimentalAPI: process.env.NODE_ENV === "development",
  };

  c.set("featureFlags", flags);
  await next();
};

async function isFeatureEnabled(
  feature: string,
  userId?: string,
  userRole?: string,
): Promise<boolean> {
  // Check external feature flag service
  // For now, return simple logic
  if (userRole === "admin") return true;
  if (feature === "newUI" && Math.random() > 0.5) return true;
  return false;
}

// Usage in handlers
app.get("/dashboard", (c) => {
  const flags = c.get("featureFlags");

  return c.json({
    dashboard: {
      useNewUI: flags.newUI,
      showBetaFeatures: flags.betaFeatures,
      showAnalytics: flags.advancedAnalytics,
    },
  });
});
```

### Logging Context

```typescript
// src/middleware/logging-context.ts
import { Context, Next } from "hono";

export interface Logger {
  info: (message: string, meta?: any) => void;
  warn: (message: string, meta?: any) => void;
  error: (message: string, meta?: any) => void;
  debug: (message: string, meta?: any) => void;
}

export const loggingContextMiddleware = async (c: Context, next: Next) => {
  const requestId = c.get("requestId");
  const userId = c.get("userId");

  const logger: Logger = {
    info: (message, meta = {}) => {
      console.log(
        JSON.stringify({
          level: "info",
          message,
          requestId,
          userId,
          timestamp: new Date().toISOString(),
          ...meta,
        }),
      );
    },

    warn: (message, meta = {}) => {
      console.warn(
        JSON.stringify({
          level: "warn",
          message,
          requestId,
          userId,
          timestamp: new Date().toISOString(),
          ...meta,
        }),
      );
    },

    error: (message, meta = {}) => {
      console.error(
        JSON.stringify({
          level: "error",
          message,
          requestId,
          userId,
          timestamp: new Date().toISOString(),
          ...meta,
        }),
      );
    },

    debug: (message, meta = {}) => {
      if (process.env.LOG_LEVEL === "debug") {
        console.debug(
          JSON.stringify({
            level: "debug",
            message,
            requestId,
            userId,
            timestamp: new Date().toISOString(),
            ...meta,
          }),
        );
      }
    },
  };

  c.set("logger", logger);
  await next();
};

// Usage in handlers
app.post("/users", async (c) => {
  const logger = c.get("logger");
  const userData = await c.req.json();

  logger.info("Creating new user", { email: userData.email });

  try {
    const user = await createUser(userData);
    logger.info("User created successfully", { userId: user.id });
    return c.json({ user }, 201);
  } catch (error) {
    logger.error("Failed to create user", { error: error.message });
    throw error;
  }
});
```

### Multi-Tenant Context

```typescript
// src/middleware/tenant-context.ts
import { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  settings: {
    features: string[];
    limits: {
      users: number;
      storage: number;
    };
  };
}

export const tenantContextMiddleware = async (c: Context, next: Next) => {
  // Extract tenant from subdomain or header
  const host = c.req.header("host") || "";
  const tenantHeader = c.req.header("x-tenant-id");

  let tenantId: string | null = null;

  if (tenantHeader) {
    tenantId = tenantHeader;
  } else {
    // Extract from subdomain (e.g., tenant1.myapp.com)
    const subdomain = host.split(".")[0];
    if (subdomain && subdomain !== "www" && subdomain !== "api") {
      tenantId = subdomain;
    }
  }

  if (!tenantId) {
    throw new HTTPException(400, { message: "Tenant not specified" });
  }

  // Load tenant configuration
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new HTTPException(404, { message: "Tenant not found" });
  }

  c.set("tenant", tenant);
  c.set("tenantId", tenant.id);

  await next();
};

async function getTenantById(id: string): Promise<Tenant | null> {
  // Implementation to fetch tenant from database
  // This is a mock implementation
  return {
    id,
    name: `Tenant ${id}`,
    subdomain: id,
    settings: {
      features: ["basic", "advanced"],
      limits: {
        users: 100,
        storage: 1024 * 1024 * 1024, // 1GB
      },
    },
  };
}

// Usage with tenant isolation
app.get("/users", async (c) => {
  const tenant = c.get("tenant");
  const db = c.get("db");

  // Query users for specific tenant
  const users = await db.query("SELECT * FROM users WHERE tenant_id = $1", [
    tenant.id,
  ]);

  return c.json({ users });
});
```

### Context Composition

```typescript
// src/middleware/context-composer.ts
import { Context, Next } from "hono";
import { requestContextMiddleware } from "./request-context";
import { userContextMiddleware } from "./user-context";
import { loggingContextMiddleware } from "./logging-context";
import { featureFlagsMiddleware } from "./feature-flags";

// Compose multiple context middleware
export const contextMiddleware = async (c: Context, next: Next) => {
  // Chain multiple context middleware
  await requestContextMiddleware(c, async () => {
    await userContextMiddleware(c, async () => {
      await loggingContextMiddleware(c, async () => {
        await featureFlagsMiddleware(c, next);
      });
    });
  });
};

// Alternative using a middleware chain helper
export function composeMiddleware(
  ...middlewares: Array<(c: Context, next: Next) => Promise<void>>
) {
  return async (c: Context, next: Next) => {
    let index = 0;

    async function dispatch(i: number): Promise<void> {
      if (i <= index)
        return Promise.reject(new Error("next() called multiple times"));
      index = i;

      let fn = middlewares[i];
      if (i === middlewares.length) fn = next as any;
      if (!fn) return;

      try {
        await fn(c, () => dispatch(i + 1));
      } catch (err) {
        return Promise.reject(err);
      }
    }

    return dispatch(0);
  };
}

// Usage
const composedContext = composeMiddleware(
  requestContextMiddleware,
  userContextMiddleware,
  loggingContextMiddleware,
  featureFlagsMiddleware,
);

app.use("*", composedContext);
```

### Context Testing

```typescript
// tests/context.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { testClient } from "hono/testing";
import { requestContextMiddleware } from "../src/middleware/request-context";

describe("Request Context", () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.use("*", requestContextMiddleware);
  });

  it("should set request context variables", async () => {
    app.get("/test", (c) => {
      const requestId = c.get("requestId");
      const requestContext = c.get("requestContext");

      return c.json({
        requestId,
        method: requestContext.method,
        path: requestContext.path,
      });
    });

    const res = await app.request("/test", {
      method: "GET",
      headers: { "User-Agent": "test-agent" },
    });

    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.requestId).toBeDefined();
    expect(data.method).toBe("GET");
    expect(data.path).toBe("/test");
  });

  it("should add request ID to response headers", async () => {
    app.get("/test", (c) => c.json({ success: true }));

    const res = await app.request("/test");

    expect(res.headers.get("X-Request-ID")).toBeDefined();
  });
});
```

### Sources

- [Context Documentation](https://hono.dev/docs/api/context)
- [Variables](https://hono.dev/docs/api/context#var)
- [Environment Variables](https://hono.dev/docs/api/context#env)
