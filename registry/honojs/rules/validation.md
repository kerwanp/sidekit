---
parent: honojs
name: Validation
description: Input validation with Zod and custom validators
type: rule
---

## Validation

### Rules

- Input validation MUST be performed using validators
- Zod SHOULD be used as the primary validation library
- Validators MUST be applied as middleware before handlers
- Validation targets include: `json`, `query`, `header`, `param`, `cookie`, and `form`
- Validation errors MUST return appropriate error messages
- JSON validation REQUIRES `Content-Type: application/json` header
- Header names MUST be lowercase when validating
- Validation schemas MUST be stored in `src/validators/` directory
- Custom validators MUST return validated and typed data

### Zod Validation

#### Installation

```bash
npm install zod @hono/zod-validator
```

#### Basic Zod Validation

```typescript
// src/validators/user.ts
import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().min(18).max(120),
  role: z.enum(["user", "admin"]).default("user"),
});

export const updateUserSchema = createUserSchema.partial();

export const userQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  sort: z.enum(["name", "email", "createdAt"]).optional(),
});

export type CreateUser = z.infer<typeof createUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
```

#### Using Zod Validator

```typescript
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  createUserSchema,
  updateUserSchema,
  userQuerySchema,
} from "./validators/user";

const app = new Hono();

// JSON body validation
app.post("/users", zValidator("json", createUserSchema), (c) => {
  const user = c.req.valid("json");
  // user is fully typed as CreateUser
  return c.json({ user }, 201);
});

// Query parameter validation
app.get("/users", zValidator("query", userQuerySchema), (c) => {
  const { page, limit, sort } = c.req.valid("query");
  return c.json({ page, limit, sort });
});

// Multiple validations
app.put(
  "/users/:id",
  zValidator("param", z.object({ id: z.string().uuid() })),
  zValidator("json", updateUserSchema),
  (c) => {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");
    return c.json({ id, ...data });
  },
);
```

### Custom Validators

```typescript
import { validator } from "hono/validator";

// Custom form validation
app.post(
  "/upload",
  validator("form", (value, c) => {
    const { file, description } = value;

    if (!file || typeof file !== "object") {
      return c.text("File is required", 400);
    }

    if (file.size > 5 * 1024 * 1024) {
      return c.text("File too large (max 5MB)", 400);
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return c.text("Invalid file type", 400);
    }

    return {
      file,
      description: description || "No description",
    };
  }),
  async (c) => {
    const { file, description } = c.req.valid("form");
    // Process the validated file
    return c.json({ uploaded: true });
  },
);

// Custom header validation
app.get(
  "/api/data",
  validator("header", (value, c) => {
    const apiKey = value["x-api-key"];

    if (!apiKey) {
      return c.json({ error: "API key required" }, 401);
    }

    if (!apiKey.startsWith("sk_")) {
      return c.json({ error: "Invalid API key format" }, 401);
    }

    return { apiKey };
  }),
  (c) => {
    const { apiKey } = c.req.valid("header");
    return c.json({ authenticated: true });
  },
);
```

### Validation Error Handling

```typescript
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

// Custom error formatting
const validationHook = (result: any, c: any) => {
  if (!result.success) {
    return c.json(
      {
        error: "Validation failed",
        details: result.error.flatten(),
      },
      400,
    );
  }
};

app.post(
  "/users",
  zValidator("json", createUserSchema, validationHook),
  (c) => {
    const user = c.req.valid("json");
    return c.json({ user }, 201);
  },
);

// Global error handler for validation
app.onError((err, c) => {
  if (err instanceof z.ZodError) {
    return c.json(
      {
        error: "Validation error",
        issues: err.issues,
      },
      400,
    );
  }
  return c.json({ error: "Internal server error" }, 500);
});
```

### Complex Validation Scenarios

```typescript
// Conditional validation
const registrationSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    accountType: z.enum(["personal", "business"]),
    companyName: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.accountType === "business" && !data.companyName) {
        return false;
      }
      return true;
    },
    {
      message: "Company name is required for business accounts",
      path: ["companyName"],
    },
  );

// Date validation with transformation
const eventSchema = z
  .object({
    title: z.string(),
    startDate: z.string().transform((str) => new Date(str)),
    endDate: z.string().transform((str) => new Date(str)),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: "End date must be after start date",
    path: ["endDate"],
  });

// Array validation
const bulkCreateSchema = z.object({
  users: z.array(createUserSchema).min(1).max(100),
});

app.post("/users/bulk", zValidator("json", bulkCreateSchema), (c) => {
  const { users } = c.req.valid("json");
  return c.json({ created: users.length }, 201);
});
```

### Validation Composition

```typescript
// Reusable validation middleware
const paginationValidator = zValidator(
  "query",
  z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(10),
  }),
);

const authValidator = validator("header", (value, c) => {
  const token = value["authorization"];
  if (!token?.startsWith("Bearer ")) {
    return c.json({ error: "Invalid token" }, 401);
  }
  return { token: token.replace("Bearer ", "") };
});

// Use composed validators
app.get("/protected/users", authValidator, paginationValidator, (c) => {
  const { token } = c.req.valid("header");
  const { page, limit } = c.req.valid("query");
  return c.json({ page, limit, authenticated: true });
});
```

### Sources

- [Validation Documentation](https://hono.dev/docs/guides/validation)
- [Zod Validator](https://github.com/honojs/middleware/tree/main/packages/zod-validator)
- [Zod Documentation](https://zod.dev)
