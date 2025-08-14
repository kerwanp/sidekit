---
parent: honojs
name: Routing
description: Routing patterns and best practices
type: rule
---

## Routing

### Rules

- Routes MUST be defined using Hono's built-in methods (`get`, `post`, `put`, `delete`, etc.)
- Route handlers MUST be defined inline or imported from route modules
- Path parameters MUST use the `:param` syntax
- Optional parameters MUST use the `:param?` syntax
- Wildcard routes MUST use the `*` syntax
- Route grouping MUST use the `app.route()` method
- Middleware MUST be registered before route handlers
- Routes MUST be registered in order of specificity (most specific first)
- AVOID using Ruby on Rails-style controller patterns
- PREFER inline handlers for better type inference

### Examples

#### Basic Routing

```typescript
import { Hono } from "hono";

const app = new Hono();

// Basic routes
app.get("/", (c) => c.text("Hello Hono!"));
app.post("/users", (c) => c.json({ message: "User created" }, 201));
app.put("/users/:id", (c) => c.json({ message: "User updated" }));
app.delete("/users/:id", (c) => c.json({ message: "User deleted" }));

// Multiple methods
app.on(["GET", "POST"], "/endpoint", (c) => {
  return c.text(`${c.req.method} request`);
});
```

#### Path Parameters

```typescript
// Required parameter
app.get("/users/:id", (c) => {
  const id = c.req.param("id");
  return c.json({ userId: id });
});

// Optional parameter
app.get("/posts/:id?", (c) => {
  const id = c.req.param("id");
  if (id) {
    return c.json({ postId: id });
  }
  return c.json({ message: "All posts" });
});

// Multiple parameters
app.get("/users/:userId/posts/:postId", (c) => {
  const { userId, postId } = c.req.param();
  return c.json({ userId, postId });
});

// Wildcard
app.get("/files/*", (c) => {
  const path = c.req.param("*");
  return c.text(`File path: ${path}`);
});
```

#### Route Grouping

```typescript
// routes/users.ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createUserSchema, updateUserSchema } from "../validators/user";

const users = new Hono();

users
  .get("/", (c) => c.json({ users: [] }))
  .get("/:id", (c) => {
    const id = c.req.param("id");
    return c.json({ id });
  })
  .post("/", zValidator("json", createUserSchema), (c) => {
    const data = c.req.valid("json");
    return c.json(data, 201);
  })
  .put("/:id", zValidator("json", updateUserSchema), (c) => {
    const id = c.req.param("id");
    const data = c.req.valid("json");
    return c.json({ id, ...data });
  })
  .delete("/:id", (c) => {
    const id = c.req.param("id");
    return c.json({ deleted: id });
  });

export default users;

// app.ts
import users from "./routes/users";

app.route("/api/users", users);
```

#### Chained Routes

```typescript
const app = new Hono()
  .get("/posts", (c) => c.json({ posts: [] }))
  .post("/posts", (c) => c.json({ created: true }, 201))
  .get("/posts/:id", (c) => {
    const id = c.req.param("id");
    return c.json({ id });
  });
```

#### Route Precedence

```typescript
// Specific routes first
app.get("/users/me", (c) => c.json({ user: "current" }));
app.get("/users/:id", (c) => c.json({ id: c.req.param("id") }));

// Middleware before handlers
app.use("/admin/*", authMiddleware);
app.get("/admin/dashboard", (c) => c.text("Admin Dashboard"));

// Fallback routes last
app.get("*", (c) => c.text("Not Found", 404));
```

### Route Response Methods

```typescript
// Text response
app.get("/text", (c) => c.text("Plain text"));

// JSON response
app.get("/json", (c) => c.json({ key: "value" }));

// HTML response
app.get("/html", (c) => c.html("<h1>Hello</h1>"));

// Redirect
app.get("/redirect", (c) => c.redirect("/destination"));

// Custom status
app.get("/created", (c) => c.json({ created: true }, 201));

// Stream response
app.get("/stream", (c) => {
  return c.streamText(async (stream) => {
    await stream.write("Hello");
    await stream.write(" World");
  });
});
```

### Sources

- [Routing Documentation](https://hono.dev/docs/api/routing)
- [Best Practices](https://hono.dev/docs/guides/best-practices)
