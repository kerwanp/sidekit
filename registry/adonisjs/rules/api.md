---
parent: adonisjs
name: API Development
description: Guidelines for building RESTful APIs with AdonisJS 6
type: rule
---

## API Development Patterns

### RESTful API Structure

Follow RESTful conventions for API design:

```typescript
// start/routes.ts - API Routes
import router from "@adonisjs/core/services/router";
import { middleware } from "./kernel.js";

// ✅ API versioning
router
  .group(() => {
    // ✅ Resource-based routes
    router.resource("users", "#controllers/api/v1/users_controller").apiOnly();
    router.resource("posts", "#controllers/api/v1/posts_controller").apiOnly();
    router
      .resource("posts.comments", "#controllers/api/v1/comments_controller")
      .apiOnly();

    // ✅ Custom actions
    router.post(
      "users/:id/activate",
      "#controllers/api/v1/users_controller.activate",
    );
    router.post(
      "posts/:id/publish",
      "#controllers/api/v1/posts_controller.publish",
    );
    router.get(
      "posts/:id/related",
      "#controllers/api/v1/posts_controller.related",
    );
  })
  .prefix("api/v1")
  .middleware([
    middleware.auth({ guards: ["api"] }),
    middleware.throttle({ max: 1000, duration: "1h" }),
  ]);

// ✅ Public API routes
router
  .group(() => {
    router.get("posts", "#controllers/api/v1/posts_controller.index");
    router.get("posts/:id", "#controllers/api/v1/posts_controller.show");
    router.get("categories", "#controllers/api/v1/categories_controller.index");
  })
  .prefix("api/v1/public")
  .middleware([middleware.throttle({ max: 100, duration: "1h" })]);
```

### API Controller Base Class

```typescript
// app/controllers/api/base_controller.ts
import type { HttpContext } from "@adonisjs/core/http";

export default class BaseApiController {
  // ✅ Success response
  protected successResponse(
    ctx: HttpContext,
    data: any,
    message?: string,
    statusCode: number = 200,
  ) {
    return ctx.response.status(statusCode).json({
      success: true,
      data,
      message,
    });
  }

  // ✅ Error response
  protected errorResponse(
    ctx: HttpContext,
    message: string,
    statusCode: number = 400,
  ) {
    return ctx.response.status(statusCode).json({
      success: false,
      error: message,
    });
  }

  // ✅ Pagination parameters
  protected getPaginationParams(ctx: HttpContext) {
    const page = Math.max(1, parseInt(ctx.request.input("page", "1")));
    const limit = Math.min(100, parseInt(ctx.request.input("limit", "20")));
    return { page, limit };
  }
}
```

### API Resource Controllers

```typescript
// app/controllers/api/v1/users_controller.ts
import type { HttpContext } from "@adonisjs/core/http";
import BaseApiController from "#controllers/api/base_controller";
import User from "#models/user";
import {
  createUserValidator,
  updateUserValidator,
} from "#validators/user_validator";

export default class UsersController extends BaseApiController {
  // ✅ GET /api/v1/users
  async index({ request, response }: HttpContext) {
    const { page, limit } = this.getPaginationParams({
      request,
    } as HttpContext);
    const users = await User.query().paginate(page, limit);

    return this.successResponse(
      { response } as HttpContext,
      users,
      "Users retrieved successfully",
    );
  }

  // ✅ GET /api/v1/users/:id
  async show({ params, response }: HttpContext) {
    const user = await User.findOrFail(params.id);

    return this.successResponse(
      { response } as HttpContext,
      user,
      "User retrieved successfully",
    );
  }

  // ✅ POST /api/v1/users
  async store({ request, response }: HttpContext) {
    const data = await request.validateUsing(createUserValidator);
    const user = await User.create(data);

    return this.successResponse(
      { response } as HttpContext,
      user,
      "User created successfully",
      201,
    );
  }

  // ✅ PUT /api/v1/users/:id
  async update({ params, request, response }: HttpContext) {
    const user = await User.findOrFail(params.id);
    const data = await request.validateUsing(updateUserValidator);
    await user.merge(data).save();

    return this.successResponse(
      { response } as HttpContext,
      user,
      "User updated successfully",
    );
  }

  // ✅ DELETE /api/v1/users/:id
  async destroy({ params, response }: HttpContext) {
    const user = await User.findOrFail(params.id);
    await user.delete();

    return this.successResponse(
      { response } as HttpContext,
      null,
      "User deleted successfully",
    );
  }
}
```

### API Serialization

```typescript
// app/serializers/user_serializer.ts
export default class UserSerializer {
  // ✅ Transform user data for API responses
  static serialize(user: any) {
    return {
      id: user.id,
      email: user.email,
      name: user.fullName,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  // ✅ Serialize collection
  static serializeCollection(users: any[]) {
    return users.map((user) => this.serialize(user));
  }

  // ✅ Public user data
  static serializeForPublic(user: any) {
    return {
      id: user.id,
      name: user.fullName,
    };
  }
}
```

### API Validation

```typescript
// app/validators/api/user_validator.ts
import vine from "@vinejs/vine";

// ✅ API-specific validators
export const createUserApiValidator = vine.compile(
  vine.object({
    email: vine.string().email().normalizeEmail(),
    password: vine.string().minLength(8).maxLength(32),
    fullName: vine.string().minLength(2).maxLength(100),
    role: vine.enum(["user", "admin", "moderator"]).optional(),
    metadata: vine
      .object({
        source: vine.string().optional(),
        referrer: vine.string().optional(),
        utm: vine
          .object({
            source: vine.string().optional(),
            medium: vine.string().optional(),
            campaign: vine.string().optional(),
          })
          .optional(),
      })
      .optional(),
  }),
);

export const updateUserApiValidator = vine.compile(
  vine.object({
    email: vine.string().email().normalizeEmail().optional(),
    fullName: vine.string().minLength(2).maxLength(100).optional(),
    role: vine.enum(["user", "admin", "moderator"]).optional(),
    isActive: vine.boolean().optional(),
  }),
);

export const bulkActionValidator = vine.compile(
  vine.object({
    ids: vine.array(vine.number().positive()).minLength(1).maxLength(100),
    action: vine.enum(["activate", "deactivate", "delete"]),
  }),
);
```

### API Middleware

```typescript
// app/middleware/api_version_middleware.ts
import type { HttpContext } from "@adonisjs/core/http";
import type { NextFn } from "@adonisjs/core/types/http";

export default class ApiVersionMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const { request, response } = ctx;

    // ✅ API version from header or URL
    const version =
      request.header("api-version") ||
      request.url().match(/\/api\/(v\d+)\//)?.[1] ||
      "v1";

    // Add version to context
    ctx.apiVersion = version;

    // ✅ Set API response headers
    response.header("API-Version", version);
    response.header("Content-Type", "application/json");
    response.header("X-RateLimit-Limit", "1000");
    response.header("X-RateLimit-Window", "1h");

    return await next();
  }
}
```

### API Rate Limiting

```typescript
// app/middleware/api_rate_limit_middleware.ts
import type { HttpContext } from "@adonisjs/core/http";
import type { NextFn } from "@adonisjs/core/types/http";
import redis from "@adonisjs/redis/services/main";

export default class ApiRateLimitMiddleware {
  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: { maxRequests: number; windowMs: number },
  ) {
    const { request, response } = ctx;

    const key = `rate_limit:${request.ip()}`;
    const current = await redis.get(key);
    const requests = current ? parseInt(current) : 0;

    if (requests >= options.maxRequests) {
      response.header("X-RateLimit-Limit", options.maxRequests.toString());
      response.header("X-RateLimit-Remaining", "0");

      return response.status(429).json({
        success: false,
        error: "Rate limit exceeded",
      });
    }

    // Increment counter
    await redis.incr(key);
    await redis.expire(key, Math.ceil(options.windowMs / 1000));

    // Add headers
    response.header("X-RateLimit-Limit", options.maxRequests.toString());
    response.header(
      "X-RateLimit-Remaining",
      (options.maxRequests - requests - 1).toString(),
    );

    return await next();
  }
}
```

### API Documentation

```typescript
// app/controllers/api/docs_controller.ts
import type { HttpContext } from "@adonisjs/core/http";

export default class DocsController {
  // ✅ Basic API documentation
  async index({ response }: HttpContext) {
    const spec = {
      openapi: "3.0.0",
      info: {
        title: "My API",
        version: "1.0.0",
      },
      paths: {
        "/users": {
          get: {
            summary: "List users",
            responses: {
              200: {
                description: "Users retrieved successfully",
              },
            },
          },
        },
      },
    };

    return response.json(spec);
  }
}
```

### API Testing

```typescript
// tests/functional/api/users.spec.ts
import { test } from "@japa/runner";
import { UserFactory } from "#factories/user_factory";

test.group("Users API", () => {
  test("GET /api/v1/users should return paginated users", async ({
    client,
  }) => {
    await UserFactory.createMany(25);

    const response = await client
      .get("/api/v1/users")
      .header("Authorization", "Bearer valid-token")
      .qs({ page: 1, limit: 10 });

    response.assertStatus(200);
    response.assertBodyContains({
      success: true,
      data: (users: any[]) => users.length === 10,
      meta: {
        pagination: {
          currentPage: 1,
          perPage: 10,
          total: 25,
        },
      },
    });
  });

  test("POST /api/v1/users should create user with valid data", async ({
    client,
  }) => {
    const userData = {
      email: "test@example.com",
      password: "password123",
      fullName: "Test User",
    };

    const response = await client
      .post("/api/v1/users")
      .header("Authorization", "Bearer admin-token")
      .json(userData);

    response.assertStatus(201);
    response.assertBodyContains({
      success: true,
      data: {
        email: userData.email,
        name: userData.fullName,
      },
      message: "User created successfully",
    });
  });

  test("should handle rate limiting", async ({ client }) => {
    // Make requests up to the limit
    for (let i = 0; i < 100; i++) {
      await client
        .get("/api/v1/users")
        .header("Authorization", "Bearer valid-token");
    }

    // This request should be rate limited
    const response = await client
      .get("/api/v1/users")
      .header("Authorization", "Bearer valid-token");

    response.assertStatus(429);
    response.assertBodyContains({
      success: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
      },
    });
  });
});
```

### API Best Practices

#### DO's

```typescript
// ✅ Use proper HTTP methods
router.get('users', 'UsersController.index')       // List
router.post('users', 'UsersController.store')      // Create
router.get('users/:id', 'UsersController.show')    // Read
router.put('users/:id', 'UsersController.update')  // Update
router.delete('users/:id', 'UsersController.destroy') // Delete

// ✅ Use consistent response format
{
  "success": true,
  "data": { ... },
  "message": "Operation successful",
  "meta": { ... }
}

// ✅ Include pagination metadata
{
  "data": [...],
  "meta": {
    "pagination": {
      "currentPage": 1,
      "perPage": 20,
      "total": 100,
      "lastPage": 5
    }
  }
}

// ✅ Use proper status codes
201 // Created
200 // Success
404 // Not Found
422 // Validation Error
429 // Rate Limited
```

#### DON'Ts

```typescript
// ❌ Inconsistent response formats
{ "users": [...] }  // Sometimes
{ "data": [...] }   // Other times

// ❌ Exposing sensitive data
{
  "user": {
    "password": "hashed_password",
    "secret_key": "sensitive_data"
  }
}

// ❌ Not handling edge cases
// Missing pagination, error handling, validation

// ❌ Poor endpoint naming
POST /api/getUserById
GET /api/createUser
```

### Sources

- [AdonisJS API Development](https://docs.adonisjs.com/guides/controllers#api-controllers)
- [RESTful API Design](https://restfulapi.net/)
- [OpenAPI Specification](https://swagger.io/specification/)
- [HTTP Status Codes](https://httpstatuses.com/)
