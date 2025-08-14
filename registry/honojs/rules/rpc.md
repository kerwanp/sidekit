---
parent: honojs
name: RPC
description: Type-safe client-server communication
type: rule
---

## RPC (Remote Procedure Call)

### Rules

- RPC routes MUST be chained to maintain type information
- Client types MUST be generated from server route definitions
- Type safety MUST be maintained across client-server boundary
- Route definitions MUST be exported for client generation
- RPC endpoints SHOULD use consistent naming conventions
- Error handling MUST be type-safe on both ends
- Request/response validation MUST be implemented
- RPC client MUST handle network errors gracefully

### Basic RPC Setup

```typescript
// server/routes/api.ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

// Define API routes with chaining for type inference
const api = new Hono()
  .get("/users", (c) => {
    const users = getUsers();
    return c.json({ users });
  })
  .get("/users/:id", (c) => {
    const id = c.req.param("id");
    const user = getUserById(id);
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }
    return c.json({ user });
  })
  .post("/users", zValidator("json", createUserSchema), (c) => {
    const data = c.req.valid("json");
    const user = createUser(data);
    return c.json({ user }, 201);
  })
  .put("/users/:id", zValidator("json", createUserSchema.partial()), (c) => {
    const id = c.req.param("id");
    const data = c.req.valid("json");
    const user = updateUser(id, data);
    return c.json({ user });
  })
  .delete("/users/:id", (c) => {
    const id = c.req.param("id");
    deleteUser(id);
    return c.json({ success: true });
  });

// Export the type for client generation
export type ApiType = typeof api;
export default api;

// server/index.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import api from "./routes/api";

const app = new Hono().use("*", cors()).route("/api", api);

export default app;
export type AppType = typeof app;
```

### Type-Safe Client

```typescript
// client/api.ts
import { hc } from "hono/client";
import type { ApiType } from "../server/routes/api";

// Create typed client
const client = hc<ApiType>("http://localhost:3000/api");

// Usage with full type safety
export const userApi = {
  // GET /api/users
  getUsers: async () => {
    const res = await client.users.$get();
    if (!res.ok) {
      throw new Error("Failed to fetch users");
    }
    return await res.json(); // Typed as { users: User[] }
  },

  // GET /api/users/:id
  getUser: async (id: string) => {
    const res = await client.users[":id"].$get({
      param: { id },
    });
    if (res.status === 404) {
      return null;
    }
    if (!res.ok) {
      throw new Error("Failed to fetch user");
    }
    return await res.json(); // Typed as { user: User }
  },

  // POST /api/users
  createUser: async (user: { name: string; email: string }) => {
    const res = await client.users.$post({
      json: user,
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to create user");
    }
    return await res.json(); // Typed as { user: User }
  },

  // PUT /api/users/:id
  updateUser: async (
    id: string,
    updates: Partial<{ name: string; email: string }>,
  ) => {
    const res = await client.users[":id"].$put({
      param: { id },
      json: updates,
    });
    if (!res.ok) {
      throw new Error("Failed to update user");
    }
    return await res.json(); // Typed as { user: User }
  },

  // DELETE /api/users/:id
  deleteUser: async (id: string) => {
    const res = await client.users[":id"].$delete({
      param: { id },
    });
    if (!res.ok) {
      throw new Error("Failed to delete user");
    }
    return await res.json(); // Typed as { success: boolean }
  },
};
```

### Advanced RPC Patterns

```typescript
// server/routes/posts.ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const postQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  author: z.string().optional(),
  tag: z.string().optional(),
});

const createPostSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  tags: z.array(z.string()).default([]),
  published: z.boolean().default(false),
});

// Complex RPC with nested resources
const posts = new Hono()
  // List posts with query parameters
  .get("/", zValidator("query", postQuerySchema), async (c) => {
    const query = c.req.valid("query");
    const { posts, pagination } = await getPosts(query);
    return c.json({ posts, pagination });
  })

  // Get post by ID
  .get("/:id", async (c) => {
    const id = c.req.param("id");
    const post = await getPostById(id);
    if (!post) {
      return c.json({ error: "Post not found" }, 404);
    }
    return c.json({ post });
  })

  // Create new post
  .post("/", zValidator("json", createPostSchema), async (c) => {
    const data = c.req.valid("json");
    const post = await createPost(data);
    return c.json({ post }, 201);
  })

  // Get post comments
  .get("/:id/comments", async (c) => {
    const postId = c.req.param("id");
    const comments = await getPostComments(postId);
    return c.json({ comments });
  })

  // Add comment to post
  .post(
    "/:id/comments",
    zValidator(
      "json",
      z.object({
        content: z.string().min(1),
        author: z.string().min(1),
      }),
    ),
    async (c) => {
      const postId = c.req.param("id");
      const data = c.req.valid("json");
      const comment = await addComment(postId, data);
      return c.json({ comment }, 201);
    },
  );

export type PostsType = typeof posts;
export default posts;
```

### Client with Error Handling

```typescript
// client/posts.ts
import { hc } from "hono/client";
import type { PostsType } from "../server/routes/posts";

const client = hc<PostsType>("http://localhost:3000/api/posts");

export class PostsApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: any,
  ) {
    super(message);
    this.name = "PostsApiError";
  }
}

export const postsApi = {
  getPosts: async (query?: {
    page?: number;
    limit?: number;
    author?: string;
    tag?: string;
  }) => {
    try {
      const res = await client.$get({
        query: query
          ? {
              page: query.page?.toString(),
              limit: query.limit?.toString(),
              author: query.author,
              tag: query.tag,
            }
          : undefined,
      });

      if (!res.ok) {
        const error = await res
          .json()
          .catch(() => ({ error: "Unknown error" }));
        throw new PostsApiError(
          error.error || "Failed to fetch posts",
          res.status,
          error,
        );
      }

      return await res.json();
    } catch (error) {
      if (error instanceof PostsApiError) throw error;
      throw new PostsApiError("Network error", 0, error);
    }
  },

  getPost: async (id: string) => {
    try {
      const res = await client[":id"].$get({ param: { id } });

      if (res.status === 404) {
        return null;
      }

      if (!res.ok) {
        const error = await res
          .json()
          .catch(() => ({ error: "Unknown error" }));
        throw new PostsApiError(
          error.error || "Failed to fetch post",
          res.status,
        );
      }

      return await res.json();
    } catch (error) {
      if (error instanceof PostsApiError) throw error;
      throw new PostsApiError("Network error", 0, error);
    }
  },

  createPost: async (post: {
    title: string;
    content: string;
    tags?: string[];
    published?: boolean;
  }) => {
    try {
      const res = await client.$post({ json: post });

      if (!res.ok) {
        const error = await res
          .json()
          .catch(() => ({ error: "Unknown error" }));
        throw new PostsApiError(
          error.error || "Failed to create post",
          res.status,
          error,
        );
      }

      return await res.json();
    } catch (error) {
      if (error instanceof PostsApiError) throw error;
      throw new PostsApiError("Network error", 0, error);
    }
  },
};
```

### RPC with Authentication

```typescript
// client/authenticated-client.ts
import { hc } from "hono/client";
import type { AppType } from "../server";

export class AuthenticatedClient {
  private client: ReturnType<typeof hc<AppType>>;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.client = hc<AppType>(baseUrl);
  }

  setToken(token: string) {
    this.token = token;
  }

  private getHeaders() {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }

  async getProfile() {
    const res = await this.client.auth.me.$get(
      {},
      {
        headers: this.getHeaders(),
      },
    );

    if (!res.ok) {
      throw new Error("Failed to get profile");
    }

    return await res.json();
  }

  async updateProfile(data: { name?: string; email?: string }) {
    const res = await this.client.auth.me.$put(
      {
        json: data,
      },
      {
        headers: this.getHeaders(),
      },
    );

    if (!res.ok) {
      throw new Error("Failed to update profile");
    }

    return await res.json();
  }
}

// Usage
const api = new AuthenticatedClient("http://localhost:3000");
api.setToken("your-jwt-token");

const profile = await api.getProfile();
await api.updateProfile({ name: "New Name" });
```

### RPC Testing

```typescript
// tests/rpc.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { testClient } from "hono/testing";
import type { AppType } from "../src/app";
import app from "../src/app";

describe("RPC API", () => {
  let client: ReturnType<typeof testClient<AppType>>;

  beforeEach(() => {
    client = testClient(app);
  });

  it("should get users with type safety", async () => {
    const res = await client.api.users.$get();

    expect(res.status).toBe(200);

    const data = await res.json();
    // data is typed as { users: User[] }
    expect(data).toHaveProperty("users");
    expect(Array.isArray(data.users)).toBe(true);
  });

  it("should create user with validation", async () => {
    const res = await client.api.users.$post({
      json: {
        name: "Test User",
        email: "test@example.com",
      },
    });

    expect(res.status).toBe(201);

    const data = await res.json();
    // data is typed as { user: User }
    expect(data.user).toHaveProperty("id");
    expect(data.user.name).toBe("Test User");
  });

  it("should handle validation errors", async () => {
    const res = await client.api.users.$post({
      json: {
        name: "",
        email: "invalid-email",
      },
    });

    expect(res.status).toBe(400);

    const error = await res.json();
    expect(error).toHaveProperty("error");
  });
});
```

### React Hook Integration

```typescript
// hooks/useApi.ts
import { useState, useEffect } from "react";
import { userApi, PostsApiError } from "../client/api";

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    userApi
      .getUsers()
      .then((data) => {
        setUsers(data.users);
        setError(null);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return { users, loading, error };
}

export function useCreateUser() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createUser = async (userData: { name: string; email: string }) => {
    setLoading(true);
    setError(null);

    try {
      const result = await userApi.createUser(userData);
      return result;
    } catch (err) {
      const message =
        err instanceof PostsApiError ? err.message : "Failed to create user";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createUser, loading, error };
}
```

### Sources

- [RPC Guide](https://hono.dev/docs/guides/rpc)
- [Client Documentation](https://hono.dev/docs/guides/rpc#client)
- [Type Safety](https://hono.dev/docs/guides/rpc#type-safety)
