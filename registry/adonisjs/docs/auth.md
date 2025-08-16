---
parent: adonisjs
name: Authentication
description: Guidelines for authentication and authorization in AdonisJS 6
type: documentation
---

## Authentication and Authorization

### Authentication Setup

Install the auth package and configure guards:

```bash
node ace add @adonisjs/auth --guard=session
# or
node ace add @adonisjs/auth --guard=access_tokens
```

### Authentication Configuration

```typescript
// config/auth.ts
import { defineConfig } from "@adonisjs/auth";
import { sessionGuard, sessionUserProvider } from "@adonisjs/auth/session";
import {
  accessTokensGuard,
  accessTokensUserProvider,
} from "@adonisjs/auth/access_tokens";

const authConfig = defineConfig({
  default: "web",
  guards: {
    // ✅ Session-based authentication for web apps
    web: sessionGuard({
      provider: sessionUserProvider({
        model: () => import("#models/user"),
      }),
    }),

    // ✅ Token-based authentication for APIs
    api: accessTokensGuard({
      provider: accessTokensUserProvider({
        model: () => import("#models/user"),
        tokens: "accessTokens",
      }),
    }),
  },
});

export default authConfig;
```

### User Model for Authentication

```typescript
// app/models/user.ts
import { DateTime } from "luxon";
import hash from "@adonisjs/core/services/hash";
import { compose } from "@adonisjs/core/helpers";
import { BaseModel, column, beforeSave } from "@adonisjs/lucid/orm";
import { withAuthFinder } from "@adonisjs/auth/mixins/lucid";
import { DbAccessTokensProvider } from "@adonisjs/auth/access_tokens";

const AuthFinder = withAuthFinder(() => hash.use("scrypt"), {
  uids: ["email"],
  passwordColumnName: "password",
});

export default class User extends compose(BaseModel, AuthFinder) {
  @column({ isPrimary: true })
  declare id: number;

  @column()
  declare email: string;

  @column()
  declare fullName: string;

  @column({ serializeAs: null })
  declare password: string;

  @column()
  declare role: string;

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime;

  // ✅ For access tokens authentication
  static accessTokens = DbAccessTokensProvider.forModel(User);

  // ✅ Password hashing
  @beforeSave()
  static async hashPassword(user: User) {
    if (user.$dirty.password) {
      user.password = await hash.make(user.password);
    }
  }

  // ✅ Password verification
  async verifyPassword(plainPassword: string) {
    return await hash.verify(this.password, plainPassword);
  }
}
```

### Authentication Controller

```typescript
// app/controllers/auth_controller.ts
import type { HttpContext } from "@adonisjs/core/http";
import User from "#models/user";
import { loginValidator, registerValidator } from "#validators/auth_validator";

export default class AuthController {
  // ✅ Session-based login
  async login({ request, response, auth }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator);

    try {
      const user = await User.verifyCredentials(email, password);
      await auth.use("web").login(user);

      return response.json({
        message: "Login successful",
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        },
      });
    } catch {
      return response.unauthorized({
        error: "Invalid credentials",
      });
    }
  }

  // ✅ API token-based login
  async apiLogin({ request, response }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator);

    try {
      const user = await User.verifyCredentials(email, password);
      const token = await User.accessTokens.create(user, ["*"], {
        expiresIn: "30 days",
      });

      return response.json({
        message: "Login successful",
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        },
        token: {
          type: "Bearer",
          value: token.value!.release(),
        },
      });
    } catch {
      return response.unauthorized({
        error: "Invalid credentials",
      });
    }
  }

  // ✅ User registration
  async register({ request, response }: HttpContext) {
    const data = await request.validateUsing(registerValidator);

    try {
      const user = await User.create({
        ...data,
        role: "user", // Default role
      });

      return response.status(201).json({
        message: "Registration successful",
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        },
      });
    } catch (error) {
      if (error.code === "23505") {
        // Unique constraint violation
        return response.conflict({
          error: "Email already registered",
        });
      }
      throw error;
    }
  }

  // ✅ Session logout
  async logout({ response, auth }: HttpContext) {
    await auth.use("web").logout();
    return response.json({
      message: "Logout successful",
    });
  }

  // ✅ API token logout
  async apiLogout({ response, auth }: HttpContext) {
    const user = auth.getUserOrFail();
    const token = auth.use("api").tokenOrFail();

    await User.accessTokens.delete(user, token.identifier);

    return response.json({
      message: "Logout successful",
    });
  }

  // ✅ Get current user profile
  async me({ response, auth }: HttpContext) {
    const user = auth.getUserOrFail();

    return response.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  }
}
```

### Authentication Validators

```typescript
// app/validators/auth_validator.ts
import vine from "@vinejs/vine";

export const loginValidator = vine.compile(
  vine.object({
    email: vine.string().email().normalizeEmail(),
    password: vine.string().minLength(1),
    rememberMe: vine.boolean().optional(),
  }),
);

export const registerValidator = vine.compile(
  vine.object({
    email: vine.string().email().normalizeEmail(),
    password: vine.string().minLength(8).maxLength(32).confirmed(),
    fullName: vine.string().minLength(2).maxLength(100),
    agreeToTerms: vine.boolean().isTrue(),
  }),
);

export const changePasswordValidator = vine.compile(
  vine.object({
    currentPassword: vine.string(),
    password: vine.string().minLength(8).confirmed(),
  }),
);
```

### Authentication Middleware

```typescript
// app/middleware/auth_middleware.ts
import type { HttpContext } from "@adonisjs/core/http";
import type { NextFn } from "@adonisjs/core/types/http";

export default class AuthMiddleware {
  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: { guards?: string[] } = {},
  ) {
    const guards = options.guards || ["web"];

    for (const guard of guards) {
      try {
        await ctx.auth.use(guard).check();
        if (ctx.auth.use(guard).isAuthenticated) {
          return await next();
        }
      } catch {
        // Continue to next guard
      }
    }

    return ctx.response.unauthorized({
      error: "Authentication required",
    });
  }
}
```

### Authorization Patterns

#### Role-Based Access Control

```typescript
// app/middleware/role_middleware.ts
import type { HttpContext } from "@adonisjs/core/http";
import type { NextFn } from "@adonisjs/core/types/http";

export default class RoleMiddleware {
  async handle(ctx: HttpContext, next: NextFn, options: { roles: string[] }) {
    const user = ctx.auth.getUserOrFail();

    if (!options.roles.includes(user.role)) {
      return ctx.response.forbidden({
        error: "Insufficient permissions",
      });
    }

    return await next();
  }
}

// Usage in routes
router
  .group(() => {
    router.get("admin/users", "#controllers/admin/users_controller.index");
  })
  .middleware([middleware.auth(), middleware.role({ roles: ["admin"] })]);
```

#### Policy-Based Authorization

```typescript
// app/policies/post_policy.ts
import User from "#models/user";
import Post from "#models/post";

export default class PostPolicy {
  static async canUpdate(user: User, post: Post) {
    return user.role === "admin" || post.userId === user.id;
  }

  static async canDelete(user: User, post: Post) {
    return user.role === "admin" || post.userId === user.id;
  }
}

// Usage in controller
export default class PostsController {
  async update({ params, request, response, auth }: HttpContext) {
    const user = auth.getUserOrFail();
    const post = await Post.findOrFail(params.id);

    if (!(await PostPolicy.canUpdate(user, post))) {
      return response.forbidden({
        error: "Not authorized to update this post",
      });
    }

    const data = await request.validateUsing(updatePostValidator);
    await post.merge(data).save();

    return response.json({ data: post });
  }
}
```

### Password Management

```typescript
// app/controllers/password_controller.ts
import type { HttpContext } from "@adonisjs/core/http";
import User from "#models/user";
import { changePasswordValidator } from "#validators/auth_validator";

export default class PasswordController {
  // ✅ Change password for authenticated user
  async change({ request, response, auth }: HttpContext) {
    const user = auth.getUserOrFail();
    const { currentPassword, password } = await request.validateUsing(
      changePasswordValidator,
    );

    // Verify current password
    if (!(await user.verifyPassword(currentPassword))) {
      return response.badRequest({
        error: "Current password is incorrect",
      });
    }

    // Update password
    user.password = password;
    await user.save();

    return response.json({
      message: "Password changed successfully",
    });
  }

  // ✅ Request password reset
  async requestReset({ request, response }: HttpContext) {
    const { email } = await request.validateUsing(
      vine.compile(
        vine.object({
          email: vine.string().email().normalizeEmail(),
        }),
      ),
    );

    const user = await User.findBy("email", email);
    if (!user) {
      return response.json({
        message: "If the email exists, a reset link has been sent",
      });
    }

    // Generate and send reset token
    // Implementation depends on your requirements

    return response.json({
      message: "Password reset link sent",
    });
  }
}
```

### API Authentication Routes

```typescript
// start/routes.ts
import router from "@adonisjs/core/services/router";
import { middleware } from "./kernel.js";

// ✅ Public authentication routes
router
  .group(() => {
    router.post("login", "#controllers/auth_controller.login");
    router.post("register", "#controllers/auth_controller.register");
    router.post(
      "forgot-password",
      "#controllers/password_controller.requestReset",
    );
    router.post("reset-password", "#controllers/password_controller.reset");
  })
  .prefix("auth");

// ✅ API routes with token authentication
router
  .group(() => {
    router.post("login", "#controllers/auth_controller.apiLogin");
    router.post("logout", "#controllers/auth_controller.apiLogout");
    router.get("me", "#controllers/auth_controller.me");
    router.put("password", "#controllers/password_controller.change");
  })
  .prefix("api/auth")
  .middleware([middleware.auth({ guards: ["api"] })]);

// ✅ Protected API routes
router
  .group(() => {
    router.resource("posts", "#controllers/posts_controller").apiOnly();
    router.resource("comments", "#controllers/comments_controller").apiOnly();
  })
  .prefix("api/v1")
  .middleware([middleware.auth({ guards: ["api"] })]);
```

### Testing Authentication

```typescript
// tests/functional/auth.spec.ts
import { test } from "@japa/runner";
import User from "#models/user";

test.group("Authentication", () => {
  test("should login with valid credentials", async ({ client, assert }) => {
    const user = await User.create({
      email: "test@example.com",
      password: "password123",
      fullName: "Test User",
      role: "user",
    });

    const response = await client.post("/auth/login").json({
      email: "test@example.com",
      password: "password123",
    });

    response.assertStatus(200);
    response.assertBodyContains({
      message: "Login successful",
      user: {
        email: "test@example.com",
      },
    });
  });

  test("should reject invalid credentials", async ({ client }) => {
    const response = await client.post("/auth/login").json({
      email: "test@example.com",
      password: "wrong-password",
    });

    response.assertStatus(401);
    response.assertBodyContains({
      error: "Invalid credentials",
    });
  });

  test("should access protected route with token", async ({ client }) => {
    const user = await User.create({
      email: "test@example.com",
      password: "password123",
      fullName: "Test User",
      role: "user",
    });

    const token = await User.accessTokens.create(user);

    const response = await client
      .get("/api/auth/me")
      .header("Authorization", `Bearer ${token.value!.release()}`);

    response.assertStatus(200);
    response.assertBodyContains({
      user: {
        email: "test@example.com",
      },
    });
  });
});
```

### Authentication Best Practices

#### DO's

- ALWAYS hash passwords using the built-in hash service
- ALWAYS validate credentials before creating sessions/tokens
- ALWAYS use HTTPS in production for session-based auth
- ALWAYS set appropriate token expiration times
- ALWAYS implement rate limiting on auth endpoints
- ALWAYS use secure session configuration
- ALWAYS validate and sanitize user input

#### DON'Ts

```typescript
// ❌ Incorrect: Plain text password storage
user.password = plainPassword;

// ❌ Incorrect: Revealing user existence
if (!user) {
  return response.notFound({ error: "User not found" });
}

// ❌ Incorrect: Not using auth middleware
router.get("profile", "#controllers/users_controller.profile"); // No auth

// ❌ Incorrect: Exposing sensitive data
return response.json({ user }); // Includes password hash

// ❌ Incorrect: Weak password requirements
password: vine.string().minLength(4); // Too weak
```

### Sources

- [Authentication Documentation](https://docs.adonisjs.com/guides/authentication)
- [Session Guard](https://docs.adonisjs.com/guides/authentication#session-guard)
- [Access Tokens Guard](https://docs.adonisjs.com/guides/authentication#access-tokens-guard)
- [Authorization Patterns](https://docs.adonisjs.com/guides/authorization)
