---
parent: adonisjs
name: Testing
description: Guidelines for testing patterns in AdonisJS 6
type: documentation
---

## Testing Patterns

### Test Structure

Tests MUST be organized in the `tests/` directory:

```
tests/
├── bootstrap.ts          # Test bootstrap
├── functional/          # End-to-end tests
│   ├── auth.spec.ts     # Authentication tests
│   ├── users.spec.ts    # User management tests
│   └── posts.spec.ts    # Post management tests
├── unit/                # Unit tests
│   ├── models/          # Model tests
│   ├── services/        # Service tests
│   ├── validators/      # Validator tests
│   └── middleware/      # Middleware tests
└── integration/         # Integration tests
    ├── database.spec.ts # Database tests
    └── email.spec.ts    # Email service tests
```

### Test Configuration

```typescript
// tests/bootstrap.ts
import { assert } from "@japa/assert";
import { expectTypeOf } from "@japa/expect-type";
import { configure, processCLIArgs, run } from "@japa/runner";
import { fileSystem } from "@japa/file-system";
import { apiClient } from "@japa/api-client";

processCLIArgs(process.argv.splice(2));

configure({
  files: [
    "tests/unit/**/*.spec.ts",
    "tests/functional/**/*.spec.ts",
    "tests/integration/**/*.spec.ts",
  ],
  plugins: [
    assert(),
    expectTypeOf(),
    fileSystem(),
    apiClient({
      baseURL: "http://localhost:3333",
    }),
  ],
  reporters: {
    activated: ["spec"],
    list: ["spec"],
  },
});

run();
```

### Unit Testing

#### Model Testing

```typescript
// tests/unit/models/user.spec.ts
import { test } from "@japa/runner";
import User from "#models/user";
import { UserFactory } from "#factories/user_factory";

test.group("User Model", () => {
  test("should hash password before saving", async ({ assert }) => {
    const user = new User();
    user.email = "test@example.com";
    user.password = "plaintext";
    user.fullName = "Test User";

    await user.save();

    assert.notEqual(user.password, "plaintext");
    assert.isTrue(await user.verifyPassword("plaintext"));
  });

  test("should generate username from email if not provided", async ({
    assert,
  }) => {
    const user = await User.create({
      email: "john.doe@example.com",
      password: "password123",
      fullName: "John Doe",
    });

    assert.equal(user.username, "john.doe");
  });

  test("should have posts relationship", async ({ assert }) => {
    const user = await UserFactory.create();
    const posts = await user.related("posts").query();

    assert.isArray(posts);
  });
});
```

#### Service Testing

```typescript
// tests/unit/services/user_service.spec.ts
import { test } from "@japa/runner";
import UserService from "#services/user_service";
import { UserFactory } from "#factories/user_factory";

test.group("User Service", () => {
  test("should create user with valid data", async ({ assert }) => {
    const userService = new UserService();

    const userData = {
      email: "test@example.com",
      password: "password123",
      fullName: "Test User",
    };

    const user = await userService.createUser(userData);

    assert.equal(user.email, userData.email);
    assert.equal(user.fullName, userData.fullName);
    assert.exists(user.id);
  });

  test("should update user", async ({ assert }) => {
    const userService = new UserService();
    const user = await UserFactory.create();

    const updatedUser = await userService.updateUser(user.id, {
      fullName: "Updated Name",
    });

    assert.equal(updatedUser.fullName, "Updated Name");
  });
});
```

#### Validator Testing

```typescript
// tests/unit/validators/user_validator.spec.ts
import { test } from "@japa/runner";
import vine from "@vinejs/vine";
import { createUserValidator } from "#validators/user_validator";

test.group("User Validator", () => {
  test("should validate correct user data", async ({ assert }) => {
    const data = {
      email: "test@example.com",
      password: "SecurePass123!",
      passwordConfirmation: "SecurePass123!",
      fullName: "John Doe",
    };

    const result = await vine.validate({
      schema: createUserValidator,
      data,
    });

    assert.properties(result, ["email", "password", "fullName"]);
  });

  test("should fail with invalid email format", async ({ assert }) => {
    const data = {
      email: "invalid-email",
      password: "SecurePass123!",
      passwordConfirmation: "SecurePass123!",
      fullName: "John Doe",
    };

    await assert.rejects(
      () => vine.validate({ schema: createUserValidator, data }),
      (error) => error.code === "E_VALIDATION_ERROR",
    );
  });

  test("should fail with mismatched password confirmation", async ({
    assert,
  }) => {
    const data = {
      email: "test@example.com",
      password: "SecurePass123!",
      passwordConfirmation: "DifferentPass456!",
      fullName: "John Doe",
    };

    await assert.rejects(() =>
      vine.validate({ schema: createUserValidator, data }),
    );
  });
});
```

### Functional Testing

#### Authentication Tests

```typescript
// tests/functional/auth.spec.ts
import { test } from "@japa/runner";
import { UserFactory } from "#factories/user_factory";

test.group("Authentication", () => {
  test("should login with valid credentials", async ({ client, assert }) => {
    const user = await UserFactory.create({
      email: "test@example.com",
      password: "password123",
    });

    const response = await client.post("/auth/login").json({
      email: "test@example.com",
      password: "password123",
    });

    response.assertStatus(200);
    response.assertBodyContains({
      message: "Login successful",
    });
  });

  test("should reject invalid credentials", async ({ client }) => {
    const response = await client.post("/auth/login").json({
      email: "nonexistent@example.com",
      password: "wrongpassword",
    });

    response.assertStatus(401);
    response.assertBodyContains({
      error: "Invalid credentials",
    });
  });

  test("should register new user", async ({ client }) => {
    const response = await client.post("/auth/register").json({
      email: "newuser@example.com",
      password: "password123",
      passwordConfirmation: "password123",
      fullName: "New User",
      agreeToTerms: true,
    });

    response.assertStatus(201);
    response.assertBodyContains({
      message: "Registration successful",
    });
  });

  test("should access protected route with token", async ({ client }) => {
    const user = await UserFactory.create();
    const token = await User.accessTokens.create(user);

    const response = await client
      .get("/api/profile")
      .header("Authorization", `Bearer ${token.value!.release()}`);

    response.assertStatus(200);
    response.assertBodyContains({
      user: {
        id: user.id,
        email: user.email,
      },
    });
  });
});
```

#### API Tests

```typescript
// tests/functional/posts.spec.ts
import { test } from "@japa/runner";
import { UserFactory } from "#factories/user_factory";
import { PostFactory } from "#factories/post_factory";

test.group("Posts API", () => {
  test("should list all posts", async ({ client }) => {
    await PostFactory.createMany(3);

    const response = await client.get("/api/posts");

    response.assertStatus(200);
    response.assertBodyContains({
      data: (posts: any[]) => posts.length === 3,
    });
  });

  test("should create post when authenticated", async ({ client }) => {
    const user = await UserFactory.create();
    const token = await User.accessTokens.create(user);

    const postData = {
      title: "Test Post",
      content: "This is a test post content",
    };

    const response = await client
      .post("/api/posts")
      .header("Authorization", `Bearer ${token.value!.release()}`)
      .json(postData);

    response.assertStatus(201);
    response.assertBodyContains({
      data: {
        title: postData.title,
      },
    });
  });

  test("should reject unauthenticated post creation", async ({ client }) => {
    const response = await client.post("/api/posts").json({
      title: "Test Post",
      content: "Content",
    });

    response.assertStatus(401);
  });

  test("should update own post", async ({ client }) => {
    const user = await UserFactory.create();
    const post = await PostFactory.merge({ userId: user.id }).create();
    const token = await User.accessTokens.create(user);

    const response = await client
      .put(`/api/posts/${post.id}`)
      .header("Authorization", `Bearer ${token.value!.release()}`)
      .json({
        title: "Updated Title",
      });

    response.assertStatus(200);
    response.assertBodyContains({
      data: {
        title: "Updated Title",
      },
    });
  });
});
```

### Database Testing

```typescript
// tests/integration/database.spec.ts
import { test } from "@japa/runner";
import Database from "@adonisjs/lucid/services/db";
import User from "#models/user";

test.group("Database Integration", () => {
  test("should handle database transactions", async ({ assert }) => {
    const trx = await Database.transaction();

    try {
      const user = await User.create(
        {
          email: "transaction@example.com",
          password: "password123",
          fullName: "Transaction User",
        },
        { client: trx },
      );

      assert.exists(user.id);
      await trx.rollback();

      // User should not exist after rollback
      const foundUser = await User.findBy("email", "transaction@example.com");
      assert.isNull(foundUser);
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  });
});
```

### Model Factories

```typescript
// database/factories/user_factory.ts
import User from "#models/user";
import { Factory } from "@adonisjs/lucid/factories";

export const UserFactory = Factory.define(User, async ({ faker }) => {
  return {
    email: faker.internet.email(),
    password: "password123",
    fullName: faker.person.fullName(),
    role: "user",
  };
}).build();
```

```typescript
// database/factories/post_factory.ts
import Post from "#models/post";
import { Factory } from "@adonisjs/lucid/factories";
import { UserFactory } from "./user_factory.js";

export const PostFactory = Factory.define(Post, async ({ faker }) => {
  return {
    title: faker.lorem.sentence(),
    content: faker.lorem.paragraphs(3),
    slug: faker.lorem.slug(),
    published: faker.datatype.boolean(),
  };
})
  .relation("author", () => UserFactory)
  .build();
```

### Testing Middleware

```typescript
// tests/unit/middleware/auth_middleware.spec.ts
import { test } from "@japa/runner";
import { HttpContextFactory } from "@adonisjs/core/factories/http";
import AuthMiddleware from "#middleware/auth_middleware";

test.group("Auth Middleware", () => {
  test("should allow authenticated requests", async ({ assert }) => {
    const ctx = new HttpContextFactory().create();
    const middleware = new AuthMiddleware();

    // Mock authentication
    ctx.auth.check = async () => {};
    ctx.auth.isAuthenticated = true;

    let nextCalled = false;
    const next = async () => {
      nextCalled = true;
      return "success";
    };

    const result = await middleware.handle(ctx, next);

    assert.isTrue(nextCalled);
    assert.equal(result, "success");
  });

  test("should reject unauthenticated requests", async ({ assert }) => {
    const ctx = new HttpContextFactory().create();
    const middleware = new AuthMiddleware();

    // Mock failed authentication
    ctx.auth.check = async () => {
      throw new Error("Unauthenticated");
    };
    ctx.auth.isAuthenticated = false;

    let nextCalled = false;
    const next = async () => {
      nextCalled = true;
    };

    await middleware.handle(ctx, next);

    assert.isFalse(nextCalled);
    assert.equal(ctx.response.getStatus(), 401);
  });
});
```

### Test Database Setup

```typescript
// tests/setup.ts
import { test } from "@japa/runner";
import Database from "@adonisjs/lucid/services/db";

test.group.setup(async () => {
  // Run migrations before tests
  const { default: Migrator } = await import("@adonisjs/lucid/migrator");
  const migrator = new Migrator(Database, Application, {
    direction: "up",
  });
  await migrator.run();
});

test.group.teardown(async () => {
  await Database.manager.closeAll();
});

// Clean database before each test
test.setup(async () => {
  await Database.beginGlobalTransaction();
});

test.teardown(async () => {
  await Database.rollbackGlobalTransaction();
});
```

### Test Best Practices

#### DO's

```typescript
// ✅ Use descriptive test names
test("should create user with valid email and hashed password", async () => {});

// ✅ Use factories for test data
const user = await UserFactory.create();

// ✅ Test edge cases
test("should handle empty request body", async () => {});
test("should handle malformed JSON", async () => {});

// ✅ Use proper assertions
response.assertStatus(201);
response.assertBodyContains({ success: true });

// ✅ Test error conditions
await assert.rejects(() => service.method(), "Expected error message");

// ✅ Clean test data
test.teardown(async () => {
  await Database.truncate("users");
});
```

#### DON'Ts

```typescript
// ❌ Vague test names
test("user test", async () => {});

// ❌ Testing implementation details
assert.equal(user.hashedPassword.length, 60); // Testing bcrypt hash length

// ❌ Hardcoded test data
const user = { id: 1, email: "test@test.com" };

// ❌ Not testing error cases
// Only testing happy path

// ❌ Interdependent tests
test("first test", async () => {
  global.userId = user.id; // Don't share state
});
```

### Running Tests

```bash
# ✅ Run all tests
node ace test

# ✅ Run specific test file
node ace test tests/unit/models/user.spec.ts

# ✅ Run tests with coverage
node ace test --coverage

# ✅ Run tests in watch mode
node ace test --watch

# ✅ Run only unit tests
node ace test tests/unit/**/*.spec.ts

# ✅ Run tests with specific reporter
node ace test --reporter=json
```

### Sources

- [Testing Documentation](https://docs.adonisjs.com/guides/testing)
- [Japa Testing Framework](https://japa.dev)
- [Model Factories](https://docs.adonisjs.com/guides/database#model-factories)
- [HTTP Testing](https://japa.dev/docs/plugins/api-client)
