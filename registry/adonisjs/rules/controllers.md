---
parent: adonisjs
name: Controllers
description: Guidelines for controllers and routing patterns in AdonisJS 6
type: rule
---

## Controllers and Routing

### Controller Guidelines

Controllers MUST be placed in `app/controllers/` and follow these patterns:

#### Controller Structure

```typescript
// app/controllers/users_controller.ts
import type { HttpContext } from "@adonisjs/core/http";
import User from "#models/user";

export default class UsersController {
  // Resource methods following RESTful conventions
  async index({ response }: HttpContext) {
    const users = await User.all();
    return response.json(users);
  }

  async show({ params, response }: HttpContext) {
    const user = await User.findOrFail(params.id);
    return response.json(user);
  }

  async store({ request, response }: HttpContext) {
    const data = request.only(["email", "name", "password"]);
    const user = await User.create(data);
    return response.status(201).json(user);
  }

  async update({ params, request, response }: HttpContext) {
    const user = await User.findOrFail(params.id);
    const data = request.only(["email", "name"]);
    await user.merge(data).save();
    return response.json(user);
  }

  async destroy({ params, response }: HttpContext) {
    const resource = await Resource.findOrFail(params.id);
    await resource.delete();
    return response.status(204).send("");
  }
}
```

#### Controller Best Practices

- ALWAYS use TypeScript and type the HttpContext destructured parameters
- ALWAYS use dependency injection via `@inject()` decorator for services
- NEVER put business logic directly in controllers - use services
- ALWAYS return consistent response formats
- RELY on AdonisJS global error handling - avoid unnecessary try-catch blocks
- ALWAYS validate input data using validators
- NEVER access request body directly without validation

### Route Organization

Routes MUST be defined in `start/routes.ts` following these patterns:

#### Basic Routing

```typescript
// start/routes.ts
import router from "@adonisjs/core/services/router";
import { middleware } from "./kernel.js";

// ✅ Correct: Use magic strings for lazy loading
router.get("users", "#controllers/users_controller.index");
router.post("users", "#controllers/users_controller.store");

// ✅ Alternative: Direct import (not lazy loaded)
import UsersController from "#controllers/users_controller";
router.get("users", [UsersController, "index"]);
```

#### Resource Routes

```typescript
// ✅ Correct: Full resource routes
router.resource("users", "#controllers/users_controller");

// ✅ Correct: API-only resource routes (no create/edit forms)
router.resource("users", "#controllers/users_controller").apiOnly();

// ✅ Correct: Specific resource methods only
router
  .resource("users", "#controllers/users_controller")
  .only(["index", "show", "store"]);

// ✅ Correct: Nested resources
router.resource("users.posts", "#controllers/posts_controller");
```

#### Route Groups

```typescript
// ✅ Correct: API versioning with groups
router
  .group(() => {
    router.resource("entities", "#controllers/entities_controller").apiOnly();
    router.resource("items", "#controllers/items_controller").apiOnly();
    router
      .resource("categories", "#controllers/categories_controller")
      .apiOnly();
  })
  .prefix("api/v1")
  .middleware([middleware.auth()]);

// ✅ Correct: Admin routes with multiple middleware
router
  .group(() => {
    router.get("dashboard", "#controllers/admin/dashboard_controller.index");
    router.resource("entities", "#controllers/admin/entities_controller");
  })
  .prefix("admin")
  .middleware([middleware.auth(), middleware.admin()]);

// ✅ Correct: Public routes
router
  .group(() => {
    router.post("login", "#controllers/auth_controller.login");
    router.post("register", "#controllers/auth_controller.register");
    router.post(
      "forgot-password",
      "#controllers/auth_controller.forgotPassword",
    );
  })
  .prefix("auth");
```

#### Route Parameters

```typescript
// ✅ Correct: Route parameters with validation
router
  .get("resources/:id", "#controllers/resources_controller.show")
  .where("id", router.matchers.number());

// ✅ Correct: Optional parameters
router.get("items/:slug?", "#controllers/items_controller.show");

// ✅ Correct: Wildcard parameters
router.get("files/*", "#controllers/files_controller.serve");

// ✅ Correct: Multiple parameters
router
  .get("entities/:entityId/items/:itemId", "#controllers/items_controller.show")
  .where("entityId", router.matchers.number())
  .where("itemId", router.matchers.number());
```

#### Route Middleware

```typescript
// ✅ Correct: Global middleware on routes
router
  .get("profile", "#controllers/resources_controller.profile")
  .middleware([middleware.auth()]);

// ✅ Correct: Multiple middleware with options
router
  .post("admin/resources", "#controllers/admin/resources_controller.store")
  .middleware([middleware.auth(), middleware.role(["admin", "moderator"])]);

// ✅ Correct: Route-specific middleware
router
  .get("api/resources", "#controllers/api/resources_controller.index")
  .middleware([middleware.throttle({ max: 100, duration: "1m" })]);
```

### HttpContext Usage

ALWAYS destructure only the properties you need from HttpContext:

```typescript
// ✅ Correct: Destructure only needed properties
async store({ request, response, auth }: HttpContext) {
  const entity = auth.getUserOrFail()
  const data = request.only(['field1', 'field2'])
  // ...
}

// ❌ Incorrect: Using entire context
async store(ctx: HttpContext) {
  const entity = ctx.auth.getUserOrFail()
  const data = ctx.request.only(['field1', 'field2'])
  // ...
}
```

### Response Patterns

ALWAYS return consistent response formats:

```typescript
export default class ResourcesController {
  // ✅ Correct: Consistent success responses
  async index({ response }: HttpContext) {
    const resources = await Resource.all();
    return response.json({
      data: resources,
      meta: {
        total: resources.length,
      },
    });
  }

  // ✅ Correct: Let AdonisJS handle errors globally
  async show({ params, response }: HttpContext) {
    const resource = await Resource.findOrFail(params.id); // Throws 404 automatically
    return response.json({ data: resource });
  }

  // ✅ Correct: Status codes for different operations
  async store({ request, response }: HttpContext) {
    const resource = await Resource.create(request.only(["field1", "field2"]));
    return response.status(201).json({ data: resource });
  }

  async destroy({ params, response }: HttpContext) {
    const resource = await Resource.findOrFail(params.id);
    await resource.delete();
    return response.status(204).send("");
  }
}
```

### Route Testing

```typescript
// tests/functional/resources.spec.ts
import { test } from "@japa/runner";

test.group("Resources Controller", () => {
  test("should list all resources", async ({ client }) => {
    const response = await client.get("/api/resources");

    response.assertStatus(200);
    response.assertBodyContains({
      data: [],
    });
  });

  test("should create a new resource", async ({ client }) => {
    const resourceData = {
      field1: "value1",
      field2: "value2",
    };

    const response = await client.post("/api/resources").json(resourceData);

    response.assertStatus(201);
    response.assertBodyContains({
      data: {
        field1: resourceData.field1,
        field2: resourceData.field2,
      },
    });
  });
});
```

### Common Anti-Patterns

```typescript
// ❌ Incorrect: Business logic in controller
async store({ request, response }: HttpContext) {
  const field1 = request.input('field1')

  // ❌ Don't put validation logic here
  if (!field1 || field1.length < 3) {
    return response.status(400).json({ error: 'Invalid field1' })
  }

  // ❌ Don't put complex business logic here
  const existingResource = await Resource.findBy('field1', field1)
  if (existingResource) {
    return response.status(409).json({ error: 'Resource exists' })
  }

  const resource = await Resource.create(request.all())
  return response.json(resource)
}

// ✅ Correct: Delegate to service
async store({ request, response }: HttpContext) {
  const data = await request.validateUsing(CreateResourceValidator)
  const resource = await this.resourceService.createResource(data)
  return response.status(201).json({ data: resource })
}
```

### Sources

- [Controllers Documentation](https://docs.adonisjs.com/guides/controllers)
- [Routing Documentation](https://docs.adonisjs.com/guides/routing)
- [HTTP Context](https://docs.adonisjs.com/guides/context)
- [Resource Routes](https://docs.adonisjs.com/guides/routing#resource-routes)
- [Route Groups](https://docs.adonisjs.com/guides/routing#route-groups)
- [Route Middleware](https://docs.adonisjs.com/guides/routing#route-middleware)
- [Dependency Injection](https://docs.adonisjs.com/guides/dependency-injection)
