---
parent: honojs
name: TypeScript
description: TypeScript configuration and type safety
type: rule
---

## TypeScript

### Rules

- TypeScript MUST be used for all Hono.js applications
- Strict mode MUST be enabled in tsconfig.json
- Type inference SHOULD be leveraged wherever possible
- Explicit type annotations SHOULD be used for function parameters and return types
- Generic types MUST be used for better type safety with Context
- Custom types MUST be defined in `src/types/` directory
- Environment variables MUST be typed
- NEVER use `any` type unless absolutely necessary
- ALWAYS use type-safe validator outputs

### TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "jsx": "react-jsx",
    "jsxImportSource": "hono/jsx",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["@cloudflare/workers-types", "node"],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Type-Safe Context Variables

```typescript
// src/types/index.ts
export type Bindings = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  API_KEY: string;
};

export type Variables = {
  userId: string;
  user: {
    id: string;
    email: string;
    role: "admin" | "user";
  };
  requestId: string;
};

// src/app.ts
import { Hono } from "hono";
import type { Bindings, Variables } from "./types";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Now context is fully typed
app.use("*", async (c, next) => {
  // c.env.DATABASE_URL is typed as string
  const dbUrl = c.env.DATABASE_URL;

  // Setting variables with type safety
  c.set("requestId", crypto.randomUUID());

  await next();
});

app.get("/profile", (c) => {
  // Getting variables with type safety
  const user = c.get("user"); // Typed as { id: string, email: string, role: 'admin' | 'user' }
  return c.json(user);
});
```

### Type-Safe Route Handlers

```typescript
// Define response types
type UserResponse = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

type ErrorResponse = {
  error: string;
  code: number;
};

// Type-safe handler with explicit return type
const getUser = async (c: Context): Promise<Response> => {
  const id = c.req.param("id");
  const user = await findUser(id);

  if (!user) {
    return c.json<ErrorResponse>({ error: "User not found", code: 404 }, 404);
  }

  return c.json<UserResponse>(user);
};

app.get("/users/:id", getUser);
```

### Generic Type Patterns

```typescript
// Generic middleware factory
function createAuthMiddleware<T extends { role: string }>() {
  return async (c: Context, next: Next) => {
    const user = await authenticate(c.req.header("Authorization"));
    if (!user) {
      throw new HTTPException(401);
    }
    c.set("user", user as T);
    await next();
  };
}

// Generic response wrapper
type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
};

function createResponse<T>(data?: T, error?: string): ApiResponse<T> {
  return {
    success: !error,
    data,
    error,
    timestamp: new Date().toISOString(),
  };
}

app.get("/users", async (c) => {
  const users = await getUsers();
  return c.json(createResponse(users));
});
```

### Type-Safe Validation

```typescript
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

// Define schema and infer types
const userSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number().min(18),
});

type User = z.infer<typeof userSchema>;

// Type-safe route with validation
app.post("/users", zValidator("json", userSchema), async (c) => {
  // data is fully typed as User
  const data = c.req.valid("json");

  const user = await createUser(data);
  return c.json<User>(user, 201);
});
```

### Factory Pattern with Types

```typescript
import { createFactory } from "hono/factory";
import type { Bindings, Variables } from "./types";

const factory = createFactory<{
  Bindings: Bindings;
  Variables: Variables;
}>();

// Create typed middleware
export const authMiddleware = factory.createMiddleware(async (c, next) => {
  const token = c.req.header("Authorization");
  if (!token) {
    throw new HTTPException(401);
  }

  const user = await verifyToken(token, c.env.JWT_SECRET);
  c.set("user", user);
  await next();
});

// Create typed handlers
export const getUserHandler = factory.createHandlers(async (c) => {
  const user = c.get("user"); // Fully typed
  return c.json(user);
});
```

### Type-Safe RPC

```typescript
// server.ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const app = new Hono();

const routes = app
  .get("/users", (c) => c.json({ users: [] }))
  .get("/users/:id", (c) => c.json({ id: c.req.param("id") }))
  .post(
    "/users",
    zValidator(
      "json",
      z.object({
        name: z.string(),
        email: z.string().email(),
      }),
    ),
    (c) => {
      const user = c.req.valid("json");
      return c.json(user, 201);
    },
  );

export type AppType = typeof routes;

// client.ts
import { hc } from "hono/client";
import type { AppType } from "./server";

const client = hc<AppType>("http://localhost:3000");

// Fully typed client calls
const response = await client.users.$get();
const data = await response.json(); // data.users is typed

const createResponse = await client.users.$post({
  json: { name: "John", email: "john@example.com" },
});
```

### Environment Variables Typing

```typescript
// src/types/env.ts
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      PORT: string;
      DATABASE_URL: string;
      JWT_SECRET: string;
      API_KEY: string;
    }
  }
}

// For Cloudflare Workers
interface Env {
  DATABASE: D1Database;
  KV: KVNamespace;
  R2: R2Bucket;
  JWT_SECRET: string;
}

const app = new Hono<{ Bindings: Env }>();

app.get("/data", async (c) => {
  // All bindings are typed
  const db = c.env.DATABASE;
  const kv = c.env.KV;
  const secret = c.env.JWT_SECRET;

  return c.json({ success: true });
});
```

### Utility Types

```typescript
// Common utility types
type Nullable<T> = T | null;
type Optional<T> = T | undefined;
type AsyncResponse<T> = Promise<Response | T>;

// API types
type PaginatedResponse<T> = {
  data: T[];
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
};

type SortOrder = "asc" | "desc";

type QueryParams = {
  page?: number;
  limit?: number;
  sort?: string;
  order?: SortOrder;
};

// Database types
type Timestamps = {
  createdAt: Date;
  updatedAt: Date;
};

type SoftDelete = {
  deletedAt: Date | null;
};

type BaseEntity = Timestamps &
  SoftDelete & {
    id: string;
  };

// User entity example
interface User extends BaseEntity {
  email: string;
  name: string;
  role: "admin" | "user";
}
```

### Type Guards

```typescript
// Custom type guards
function isUser(value: unknown): value is User {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "email" in value &&
    "role" in value
  );
}

function isError(value: unknown): value is Error {
  return value instanceof Error;
}

// Usage in handlers
app.get("/current-user", async (c) => {
  const data = c.get("user");

  if (!isUser(data)) {
    throw new HTTPException(401, { message: "Invalid user data" });
  }

  // data is now typed as User
  return c.json(data);
});
```

### Sources

- [TypeScript Support](https://hono.dev/docs/getting-started/basic#typescript)
- [Type Safety Guide](https://hono.dev/docs/guides/typescript)
- [RPC Mode](https://hono.dev/docs/guides/rpc)
