---
parent: adonisjs
name: Error Handling
description: Error handling patterns and exception management in AdonisJS 6
type: documentation
---

## Error Handling

### Custom Exceptions

Create custom exceptions in `app/exceptions/` for specific error scenarios:

```typescript
// app/exceptions/user_not_found_exception.ts
import { Exception } from "@adonisjs/core/exceptions";
import type { HttpContext } from "@adonisjs/core/http";

export default class UserNotFoundException extends Exception {
  constructor(userId: number | string) {
    super(`User with ID ${userId} not found`, {
      status: 404,
      code: "USER_NOT_FOUND",
    });
  }

  async handle(error: this, ctx: HttpContext) {
    return ctx.response.status(this.status).json({
      error: this.message,
      code: this.code,
      timestamp: new Date().toISOString(),
    });
  }
}
```

```typescript
// app/exceptions/validation_exception.ts
import { Exception } from "@adonisjs/core/exceptions";
import type { HttpContext } from "@adonisjs/core/http";

export default class ValidationException extends Exception {
  constructor(
    message: string,
    public errors: Record<string, string[]>,
  ) {
    super(message, {
      status: 422,
      code: "VALIDATION_ERROR",
    });
  }

  async handle(error: this, ctx: HttpContext) {
    return ctx.response.status(this.status).json({
      error: this.message,
      code: this.code,
      errors: this.errors,
      timestamp: new Date().toISOString(),
    });
  }
}
```

```typescript
// app/exceptions/business_logic_exception.ts
import { Exception } from "@adonisjs/core/exceptions";
import type { HttpContext } from "@adonisjs/core/http";

export default class BusinessLogicException extends Exception {
  constructor(
    message: string,
    public businessCode: string,
    statusCode: number = 400,
  ) {
    super(message, {
      status: statusCode,
      code: businessCode,
    });
  }

  async handle(error: this, ctx: HttpContext) {
    return ctx.response.status(this.status).json({
      error: this.message,
      code: this.code,
      timestamp: new Date().toISOString(),
    });
  }
}
```

### Exception Handler

Configure global exception handling in `app/exceptions/handler.ts`:

```typescript
// app/exceptions/handler.ts
import logger from "@adonisjs/core/services/logger";
import { ExceptionHandler } from "@adonisjs/core/exceptions";
import type { HttpContext } from "@adonisjs/core/http";

export default class HttpExceptionHandler extends ExceptionHandler {
  protected debug = !["production", "staging"].includes(
    process.env.NODE_ENV || "",
  );

  async handle(error: any, ctx: HttpContext) {
    // ✅ Handle validation errors
    if (error.code === "E_VALIDATION_ERROR") {
      return ctx.response.status(422).json({
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        messages: error.messages,
        timestamp: new Date().toISOString(),
      });
    }

    // ✅ Handle authentication errors
    if (error.code === "E_UNAUTHORIZED_ACCESS") {
      return ctx.response.status(401).json({
        error: "Authentication required",
        code: "UNAUTHORIZED",
        timestamp: new Date().toISOString(),
      });
    }

    // ✅ Handle route not found
    if (error.code === "E_ROUTE_NOT_FOUND") {
      return ctx.response.status(404).json({
        error: "Route not found",
        code: "ROUTE_NOT_FOUND",
        path: ctx.request.url(),
        method: ctx.request.method(),
        timestamp: new Date().toISOString(),
      });
    }

    // ✅ Handle database errors
    if (error.code === "23505") {
      // Unique constraint violation
      return ctx.response.status(409).json({
        error: "Resource already exists",
        code: "DUPLICATE_RESOURCE",
        timestamp: new Date().toISOString(),
      });
    }

    // ✅ Handle model not found errors
    if (error.code === "E_ROW_NOT_FOUND") {
      return ctx.response.status(404).json({
        error: "Resource not found",
        code: "RESOURCE_NOT_FOUND",
        timestamp: new Date().toISOString(),
      });
    }

    // ✅ Handle rate limiting errors
    if (error.code === "E_TOO_MANY_REQUESTS") {
      return ctx.response.status(429).json({
        error: "Too many requests",
        code: "RATE_LIMIT_EXCEEDED",
        retryAfter: error.retryAfter,
        timestamp: new Date().toISOString(),
      });
    }

    return super.handle(error, ctx);
  }

  async report(error: any, ctx: HttpContext) {
    // ✅ Log errors with context
    if (this.shouldReport(error)) {
      logger.error("Unhandled exception", {
        error: error.message,
        stack: error.stack,
        code: error.code,
        status: error.status,
        url: ctx.request.url(),
        method: ctx.request.method(),
        userId: ctx.auth?.user?.id,
        ip: ctx.request.ip(),
        userAgent: ctx.request.header("user-agent"),
        timestamp: new Date().toISOString(),
      });
    }

    return super.report(error, ctx);
  }

  private shouldReport(error: any): boolean {
    // ✅ Don't report client errors and validation errors
    const ignoredCodes = [
      "E_VALIDATION_ERROR",
      "E_ROUTE_NOT_FOUND",
      "E_UNAUTHORIZED_ACCESS",
      "E_ROW_NOT_FOUND",
    ];

    return !ignoredCodes.includes(error.code) && error.status >= 500;
  }
}
```

### Error Handling in Controllers

```typescript
// app/controllers/users_controller.ts
import type { HttpContext } from "@adonisjs/core/http";
import User from "#models/user";
import UserService from "#services/user_service";
import UserNotFoundException from "#exceptions/user_not_found_exception";
import BusinessLogicException from "#exceptions/business_logic_exception";

export default class UsersController {
  constructor(private userService: UserService) {}

  // ✅ Let AdonisJS handle exceptions globally
  async show({ params, response }: HttpContext) {
    const user = await User.findOrFail(params.id); // Throws 404 automatically
    return response.json({ data: user });
  }

  // ✅ Custom exception for business logic
  async update({ params, request, response }: HttpContext) {
    const user = await User.findOrFail(params.id);
    const data = request.only(["email", "name"]);

    // Throw custom exception when needed
    if (data.email && !data.email.includes("@")) {
      throw new ValidationException("Invalid email format");
    }

    await user.merge(data).save();
    return response.json({ data: user });
  }

  // ✅ Validation with global error handling
  async store({ request, response }: HttpContext) {
    const data = await request.validateUsing(createUserValidator);
    const user = await this.userService.createUser(data);

    return response.status(201).json({ data: user });
  }
}
```

### Error Handling in Services

```typescript
// app/services/user_service.ts
import User from "#models/user";
import UserNotFoundException from "#exceptions/user_not_found_exception";
import BusinessLogicException from "#exceptions/business_logic_exception";

export default class UserService {
  // ✅ Service-level error handling
  async findUser(id: number): Promise<User> {
    const user = await User.find(id);

    if (!user) {
      throw new UserNotFoundException(id);
    }

    return user;
  }

  async createUser(data: any): Promise<User> {
    // Only catch specific database errors that need transformation
    try {
      return await User.create(data);
    } catch (error) {
      // Transform database constraint errors to business exceptions
      if (error.code === "23505") {
        throw new BusinessLogicException(
          "Resource already exists",
          "DUPLICATE_ENTRY",
          409,
        );
      }
      throw error;
    }
  }

  async updateUser(id: number, data: any): Promise<User> {
    const user = await this.findUser(id); // Will throw if not found

    try {
      await user.merge(data).save();
      return user;
    } catch (error) {
      if (error.code === "23505") {
        throw new BusinessLogicException(
          "Email address is already taken",
          "EMAIL_ALREADY_EXISTS",
          409,
        );
      }

      throw error;
    }
  }

  async deleteUser(id: number): Promise<void> {
    const user = await this.findUser(id);

    // Business logic check
    if (user.role === "admin") {
      throw new BusinessLogicException(
        "Admin users cannot be deleted",
        "ADMIN_DELETION_FORBIDDEN",
        403,
      );
    }

    await user.delete();
  }
}
```

### Error Handling Middleware

```typescript
// app/middleware/error_boundary_middleware.ts
import type { HttpContext } from "@adonisjs/core/http";
import type { NextFn } from "@adonisjs/core/types/http";
import logger from "@adonisjs/core/services/logger";

export default class ErrorBoundaryMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    try {
      return await next();
    } catch (error) {
      // ✅ Add request context to error
      error.requestId =
        ctx.request.header("x-request-id") || this.generateRequestId();
      error.url = ctx.request.url();
      error.method = ctx.request.method();
      error.userId = ctx.auth?.user?.id;

      // Re-throw to let the global handler deal with it
      throw error;
    }
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}
```

### API Error Responses

```typescript
// app/controllers/api/base_controller.ts
import type { HttpContext } from "@adonisjs/core/http";

export default class BaseApiController {
  // ✅ Standardized error responses
  protected errorResponse(
    ctx: HttpContext,
    message: string,
    code: string,
    statusCode: number = 400,
    details?: any,
  ) {
    return ctx.response.status(statusCode).json({
      success: false,
      error: {
        message,
        code,
        details,
        timestamp: new Date().toISOString(),
        path: ctx.request.url(),
        requestId: ctx.request.header("x-request-id"),
      },
    });
  }

  // ✅ Standardized success responses
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
      timestamp: new Date().toISOString(),
    });
  }
}
```

### Async Error Handling

```typescript
// app/services/external_api_service.ts
export default class ExternalApiService {
  // ✅ Handle network and timeout errors
  async fetchUserData(userId: number): Promise<any> {
    try {
      const response = await fetch(`https://api.example.com/users/${userId}`, {
        timeout: 5000, // 5 second timeout
        headers: {
          Authorization: `Bearer ${process.env.API_TOKEN}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new BusinessLogicException(
          `External API error: ${response.statusText}`,
          "EXTERNAL_API_ERROR",
          response.status,
        );
      }

      return await response.json();
    } catch (error) {
      if (error.name === "AbortError") {
        throw new BusinessLogicException(
          "External API request timed out",
          "API_TIMEOUT",
          504,
        );
      }

      if (error.code === "ECONNREFUSED") {
        throw new BusinessLogicException(
          "External API is unavailable",
          "API_UNAVAILABLE",
          503,
        );
      }

      throw error;
    }
  }

  // ✅ Retry logic with exponential backoff
  async fetchWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        // Don't retry client errors (4xx)
        if (error.status >= 400 && error.status < 500) {
          throw error;
        }

        if (attempt === maxRetries) {
          break;
        }

        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }
}
```

### Database Error Handling

```typescript
// app/services/database_service.ts
import Database from "@adonisjs/lucid/services/db";

export default class DatabaseService {
  // ✅ Transaction error handling
  async performComplexOperation(data: any) {
    const trx = await Database.transaction();

    try {
      const user = await User.create(data.user, { client: trx });
      const profile = await Profile.create(
        {
          ...data.profile,
          userId: user.id,
        },
        { client: trx },
      );

      await trx.commit();
      return { user, profile };
    } catch (error) {
      await trx.rollback();

      // Handle specific database errors
      if (error.code === "23505") {
        throw new BusinessLogicException(
          "Duplicate entry detected",
          "DUPLICATE_ENTRY",
          409,
        );
      }

      if (error.code === "23503") {
        throw new BusinessLogicException(
          "Foreign key constraint violation",
          "INVALID_REFERENCE",
          400,
        );
      }

      throw error;
    }
  }

  // ✅ Connection error handling
  async checkDatabaseHealth(): Promise<boolean> {
    try {
      await Database.rawQuery("SELECT 1");
      return true;
    } catch (error) {
      logger.error("Database health check failed", { error: error.message });
      return false;
    }
  }
}
```

### Error Monitoring

```typescript
// app/services/error_monitoring_service.ts
import logger from "@adonisjs/core/services/logger";

export default class ErrorMonitoringService {
  // ✅ Track error metrics
  async trackError(error: any, context: Record<string, any> = {}) {
    const errorData = {
      message: error.message,
      stack: error.stack,
      code: error.code,
      status: error.status,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      ...context,
    };

    // Log the error
    logger.error("Application error", errorData);

    // Send to external monitoring service in production
    if (process.env.NODE_ENV === "production") {
      await this.sendToMonitoringService(errorData);
    }
  }

  private async sendToMonitoringService(errorData: any) {
    try {
      // Send to Sentry, LogRocket, or other monitoring service
      // await sentry.captureException(errorData)
    } catch (monitoringError) {
      logger.error("Failed to send error to monitoring service", {
        originalError: errorData,
        monitoringError: monitoringError.message,
      });
    }
  }

  // ✅ Track performance issues
  async trackSlowOperation(
    operation: string,
    duration: number,
    threshold: number = 1000,
  ) {
    if (duration > threshold) {
      logger.warn("Slow operation detected", {
        operation,
        duration: `${duration}ms`,
        threshold: `${threshold}ms`,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
```

### Error Handling Best Practices

#### DO's

```typescript
// ✅ Use specific exception types
throw new UserNotFoundException(userId);

// ✅ Provide meaningful error messages
throw new BusinessLogicException(
  "User cannot delete their own account",
  "SELF_DELETION_FORBIDDEN",
);

// ✅ Let AdonisJS handle rejections globally
await someAsyncOperation(); // Exceptions bubble up to global handler

// ✅ Only use try-catch when transforming errors
try {
  await riskyDatabaseOperation();
} catch (error) {
  // Transform specific errors into business exceptions
  if (error.code === "SPECIFIC_DB_ERROR") {
    throw new BusinessLogicException("User-friendly message", "BUSINESS_CODE");
  }
  throw error;
}

// ✅ Use proper HTTP status codes
return response.status(404).json({ error: "Resource not found" });

// ✅ Log errors with context
logger.error("Operation failed", {
  userId,
  operation: "updateProfile",
  error: error.message,
});
```

#### DON'Ts

```typescript
// ❌ Generic error handling
throw new Error("Something went wrong");

// ❌ Swallowing errors
try {
  await riskyOperation();
} catch {
  // Ignoring error
}

// ❌ Exposing sensitive information
throw new Error(`Database connection failed: ${dbPassword}`);

// ❌ Not using appropriate status codes
return response.status(200).json({ error: "Not found" });

// ❌ Synchronous operations that might throw
const data = JSON.parse(untrustedInput); // Can throw
```

### Testing Error Handling

```typescript
// tests/unit/services/user_service.spec.ts
import { test } from "@japa/runner";
import UserService from "#services/user_service";
import UserNotFoundException from "#exceptions/user_not_found_exception";

test.group("User Service Error Handling", () => {
  test("should throw UserNotFoundException for non-existent user", async ({
    assert,
  }) => {
    const userService = new UserService();

    await assert.rejects(
      () => userService.findUser(999),
      UserNotFoundException,
    );
  });

  test("should handle duplicate email gracefully", async ({ assert }) => {
    const userService = new UserService();

    await UserFactory.create({ email: "test@example.com" });

    await assert.rejects(
      () =>
        userService.createUser({
          email: "test@example.com",
          password: "password",
          name: "Test User",
        }),
      "Email address is already registered",
    );
  });
});
```

### Sources

- [Exception Handling](https://docs.adonisjs.com/guides/exception-handling)
- [Custom Exceptions](https://docs.adonisjs.com/guides/exception-handling#custom-exceptions)
- [Error Reporting](https://docs.adonisjs.com/guides/exception-handling#error-reporting)
- [HTTP Status Codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
