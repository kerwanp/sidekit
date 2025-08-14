---
parent: adonisjs
name: Validation
description: Guidelines for VineJS validation in AdonisJS 6
type: rule
---

## VineJS Validation

### Validator Structure

Validators MUST be placed in `app/validators/` and follow these patterns:

#### Basic Validator Structure

```typescript
// app/validators/user_validator.ts
import vine from "@vinejs/vine";

// ✅ Correct: Create user validation schema
export const createUserValidator = vine.compile(
  vine.object({
    email: vine.string().email().normalizeEmail(),
    password: vine.string().minLength(8).maxLength(32).confirmed(),
    fullName: vine.string().minLength(2).maxLength(100),
    dateOfBirth: vine.date().beforeOrEqual("today"),
    role: vine.enum(["user", "admin", "moderator"]).optional(),
  }),
);

// ✅ Correct: Update user validation schema
export const updateUserValidator = vine.compile(
  vine.object({
    email: vine.string().email().normalizeEmail().optional(),
    fullName: vine.string().minLength(2).maxLength(100).optional(),
    dateOfBirth: vine.date().beforeOrEqual("today").optional(),
    role: vine.enum(["user", "admin", "moderator"]).optional(),
  }),
);

// ✅ Correct: Login validation schema
export const loginValidator = vine.compile(
  vine.object({
    email: vine.string().email().normalizeEmail(),
    password: vine.string().minLength(1),
    rememberMe: vine.boolean().optional(),
  }),
);
```

#### Post Validator Patterns

```typescript
// app/validators/post_validator.ts
import vine from "@vinejs/vine";

// ✅ Correct: Basic post validation
export const createPostValidator = vine.compile(
  vine.object({
    title: vine.string().minLength(5).maxLength(200),
    content: vine.string().minLength(10),
    slug: vine.string().regex(/^[a-z0-9-]+$/),
    categoryId: vine.number().positive(),
    tags: vine.array(vine.string()).minLength(1).maxLength(5),
    publishedAt: vine.date().optional(),
    featuredImage: vine
      .file({
        size: "2mb",
        extnames: ["jpg", "jpeg", "png"],
      })
      .optional(),
  }),
);

// ✅ Correct: Update post validation
export const updatePostValidator = vine.compile(
  vine.object({
    title: vine.string().minLength(5).maxLength(200).optional(),
    content: vine.string().minLength(10).optional(),
    slug: vine
      .string()
      .regex(/^[a-z0-9-]+$/)
      .optional(),
    categoryId: vine.number().positive().optional(),
    tags: vine.array(vine.string()).optional(),
    status: vine.enum(["draft", "published"]).optional(),
  }),
);
```

### Using Validators in Controllers

```typescript
// app/controllers/users_controller.ts
import type { HttpContext } from "@adonisjs/core/http";
import {
  createUserValidator,
  updateUserValidator,
} from "#validators/user_validator";
import User from "#models/user";

export default class UsersController {
  // ✅ Correct: Validate request data
  async store({ request, response }: HttpContext) {
    try {
      const data = await request.validateUsing(createUserValidator);
      const user = await User.create(data);
      return response.status(201).json({ data: user });
    } catch (error) {
      if (error.code === "E_VALIDATION_ERROR") {
        return response.badRequest({
          error: "Validation failed",
          messages: error.messages,
        });
      }
      throw error;
    }
  }

  // ✅ Correct: Validate with existing data check
  async update({ params, request, response }: HttpContext) {
    const user = await User.findOrFail(params.id);
    const data = await request.validateUsing(updateUserValidator);

    await user.merge(data).save();
    return response.json({ data: user });
  }

  // ✅ Correct: Manual validation
  async manualValidation({ request, response }: HttpContext) {
    try {
      const data = await vine.validate({
        schema: createUserValidator,
        data: request.all(),
      });

      // Process validated data
      const user = await User.create(data);
      return response.json({ data: user });
    } catch (error) {
      return response.badRequest({
        error: "Validation failed",
        messages: error.messages,
      });
    }
  }
}
```

### Common Validation Rules

```typescript
// app/validators/example_validator.ts
import vine from "@vinejs/vine";

export const exampleValidator = vine.compile(
  vine.object({
    // ✅ String validations
    email: vine.string().email().normalizeEmail(),
    username: vine.string().minLength(3).maxLength(20),
    url: vine.string().url(),

    // ✅ Number validations
    age: vine.number().range([18, 100]),
    price: vine.number().positive(),
    quantity: vine.number().positive(),

    // ✅ Date validations
    birthDate: vine.date().beforeOrEqual("today"),
    startDate: vine.date(),
    endDate: vine.date().afterField("startDate"),

    // ✅ Boolean validations
    isActive: vine.boolean(),
    agreeToTerms: vine.boolean().isTrue(),

    // ✅ Array validations
    tags: vine.array(vine.string()).minLength(1).maxLength(5),
    categoryIds: vine.array(vine.number().positive()),

    // ✅ File validations
    avatar: vine.file({
      size: "2mb",
      extnames: ["jpg", "jpeg", "png"],
    }),

    // ✅ Nested object validations
    address: vine.object({
      street: vine.string().minLength(5),
      city: vine.string().minLength(2),
      postalCode: vine.string(),
    }),

    // ✅ Enums
    status: vine.enum(["active", "inactive"]).optional(),
    theme: vine.enum(["light", "dark"]).optional(),
  }),
);
```

### Custom Validation Rules

```typescript
// app/validators/custom_rules.ts
import vine from "@vinejs/vine";
import User from "#models/user";

// ✅ Correct: Custom unique validation
const uniqueEmail = vine.createRule(async (value, options, field) => {
  if (typeof value !== "string") {
    return;
  }

  const user = await User.findBy("email", value);
  if (user) {
    field.report("The {{ field }} field is not unique", "unique", field);
  }
});

// ✅ Usage of custom rules
export const userRegistrationValidator = vine.compile(
  vine.object({
    email: vine.string().email().use(uniqueEmail()),
    password: vine.string().minLength(8),
    passwordConfirmation: vine.string(),
  }),
);
```

### Validation Error Handling

```typescript
// app/exceptions/validation_exception_handler.ts
import type { HttpContext } from "@adonisjs/core/http";
import { Exception } from "@adonisjs/core/exceptions";

export default class ValidationExceptionHandler {
  // ✅ Correct: Handle validation errors globally
  async handle(error: any, ctx: HttpContext) {
    if (error.code === "E_VALIDATION_ERROR") {
      return ctx.response.status(422).json({
        error: "Validation failed",
        messages: error.messages,
        fields: this.formatErrors(error.messages),
      });
    }

    // Handle other exceptions
    return ctx.response.status(500).json({
      error: "Internal server error",
    });
  }

  private formatErrors(messages: any[]) {
    return messages.reduce((acc, message) => {
      acc[message.field] = message.message;
      return acc;
    }, {});
  }
}
```

### Validation Middleware

```typescript
// app/middleware/validate_middleware.ts
import type { HttpContext } from "@adonisjs/core/http";
import type { NextFn } from "@adonisjs/core/types/http";
import vine from "@vinejs/vine";

export default class ValidateMiddleware {
  async handle(ctx: HttpContext, next: NextFn, options: { validator: any }) {
    try {
      const validatedData = await ctx.request.validateUsing(options.validator);
      ctx.validatedData = validatedData;
    } catch (error) {
      return ctx.response.badRequest({
        error: "Validation failed",
        messages: error.messages,
      });
    }

    return await next();
  }
}

// Usage in routes
router
  .post("users", "#controllers/users_controller.store")
  .middleware([middleware.validate({ validator: createUserValidator })]);
```

### Testing Validators

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
      dateOfBirth: "1990-01-01",
    };

    const result = await vine.validate({
      schema: createUserValidator,
      data,
    });

    assert.properties(result, ["email", "password", "fullName", "dateOfBirth"]);
    assert.equal(result.email, "test@example.com");
  });

  test("should fail with invalid email", async ({ assert }) => {
    const data = {
      email: "invalid-email",
      password: "SecurePass123!",
      passwordConfirmation: "SecurePass123!",
      fullName: "John Doe",
    };

    try {
      await vine.validate({
        schema: createUserValidator,
        data,
      });
      assert.fail("Should have thrown validation error");
    } catch (error) {
      assert.equal(error.code, "E_VALIDATION_ERROR");
      assert.isTrue(
        error.messages.some(
          (msg: any) => msg.field === "email" && msg.rule === "email",
        ),
      );
    }
  });
});
```

### Validation Best Practices

#### DO's

```typescript
// ✅ Correct: Use descriptive validator names
export const createUserValidator = vine.compile(...)
export const updateUserValidator = vine.compile(...)
export const loginValidator = vine.compile(...)

// ✅ Correct: Normalize data
email: vine.string().email().normalizeEmail(),
url: vine.string().url().normalizeUrl(),

// ✅ Correct: Use appropriate rules
password: vine.string().minLength(8).maxLength(32).confirmed(),
age: vine.number().range([18, 100]),

// ✅ Correct: Handle file uploads
avatar: vine.file({
  size: '2mb',
  extnames: ['jpg', 'jpeg', 'png']
})

// ✅ Correct: Use conditional validation
companyName: vine.string().requiredWhen('userType', '=', 'business')
```

#### DON'Ts

```typescript
// ❌ Incorrect: Generic validator names
export const validator1 = vine.compile(...)
export const userValidator = vine.compile(...) // Too generic

// ❌ Incorrect: Not using appropriate rules
email: vine.string(), // Should use .email()
age: vine.string(),   // Should use .number()

// ❌ Incorrect: Not handling optional fields
export const updateValidator = vine.compile(
  vine.object({
    email: vine.string().email(), // Should be optional for updates
    name: vine.string()           // Should be optional for updates
  })
)

// ❌ Incorrect: Not validating file uploads
file: vine.string() // Should use vine.file()

// ❌ Incorrect: Not using enum for fixed values
status: vine.string() // Should use vine.enum(['active', 'inactive'])
```

### Common Validation Patterns

```typescript
// ✅ Pagination validation
export const paginationValidator = vine.compile(
  vine.object({
    page: vine.number().positive().optional(),
    limit: vine.number().range([1, 100]).optional(),
    sortBy: vine.string().optional(),
    sortOrder: vine.enum(["asc", "desc"]).optional(),
  }),
);

// ✅ Search validation
export const searchValidator = vine.compile(
  vine.object({
    query: vine.string().minLength(2).maxLength(100),
    category: vine.string().optional(),
  }),
);

// ✅ Bulk operations validation
export const bulkUpdateValidator = vine.compile(
  vine.object({
    ids: vine.array(vine.number().positive()).minLength(1).maxLength(100),
    action: vine.enum(["activate", "deactivate", "delete"]),
  }),
);
```

### Sources

- [VineJS Documentation](https://vinejs.dev)
- [Validation Rules](https://vinejs.dev/docs/validation_rules)
- [Custom Rules](https://vinejs.dev/docs/custom_rules)
- [AdonisJS Validation](https://docs.adonisjs.com/guides/validation)
