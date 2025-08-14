---
parent: adonisjs
name: Security
description: Security best practices for AdonisJS 6 applications
type: rule
---

## Security Best Practices

### Input Validation and Sanitization

ALWAYS validate and sanitize user input using VineJS validators:

```typescript
// ✅ Correct: Comprehensive input validation
export const createPostValidator = vine.compile(
  vine.object({
    title: vine.string().minLength(1).maxLength(200).trim(),
    content: vine.string().minLength(10).escape(), // Escape HTML
    slug: vine.string().regex(/^[a-z0-9-]+$/), // Only alphanumeric and hyphens
    tags: vine.array(vine.string().minLength(1).maxLength(50)).maxLength(10),
    categoryId: vine.number().positive(),
    metadata: vine
      .object({
        seoTitle: vine.string().maxLength(60).trim().optional(),
        seoDescription: vine.string().maxLength(160).trim().optional(),
      })
      .optional(),
  }),
);

// ✅ Correct: File upload validation
export const uploadValidator = vine.compile(
  vine.object({
    file: vine.file({
      size: "5mb",
      extnames: ["jpg", "jpeg", "png", "gif", "pdf", "doc", "docx"],
    }),
    description: vine.string().maxLength(500).optional(),
  }),
);
```

### Authentication Security

#### Password Security

```typescript
// app/models/user.ts
import hash from "@adonisjs/core/services/hash";

export default class User extends BaseModel {
  @column({ serializeAs: null })
  declare password: string;

  // ✅ Correct: Hash passwords
  @beforeSave()
  static async hashPassword(user: User) {
    if (user.$dirty.password) {
      user.password = await hash.make(user.password);
    }
  }

  // ✅ Correct: Password verification
  async verifyPassword(plainPassword: string) {
    return await hash.verify(this.password, plainPassword);
  }
}
```

#### Session Security

```typescript
// config/session.ts
import env from "#start/env";

export default {
  driver: env.get("SESSION_DRIVER"),
  cookieName: "adonis-session",

  // ✅ Secure session configuration
  cookie: {
    path: "/",
    maxAge: "2h",
    httpOnly: true, // Prevent XSS
    secure: env.get("NODE_ENV") === "production", // HTTPS in production
    sameSite: "strict", // CSRF protection
  },

  age: "2 hours",
};
```

#### JWT Token Security

```typescript
// app/services/auth_service.ts
import jwt from "jsonwebtoken";
import env from "#start/env";

export default class AuthService {
  // ✅ Correct: JWT token generation
  generateToken(user: User) {
    return jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
      env.get("JWT_SECRET"),
      {
        expiresIn: "1h",
      },
    );
  }

  // ✅ Correct: Token verification
  verifyToken(token: string) {
    return jwt.verify(token, env.get("JWT_SECRET"));
  }
}
```

### CORS Security

```typescript
// config/cors.ts
import env from "#start/env";

export default {
  enabled: true,

  // ✅ Correct: Configure allowed origins
  origin:
    env.get("NODE_ENV") === "production" ? ["https://yourdomain.com"] : true, // Allow all origins in development

  methods: ["GET", "POST", "PUT", "DELETE"],
  headers: ["Content-Type", "Authorization"],
  credentials: true,
};
```

### SQL Injection Prevention

```typescript
// ✅ Correct: Use query builder (automatically escapes)
const users = await User.query()
  .where("email", email)
  .where("role", role)
  .limit(10);

// ✅ Correct: Parameterized raw queries
const result = await Database.rawQuery(
  "SELECT * FROM users WHERE email = ? AND created_at > ?",
  [email, startDate],
);

// ❌ Incorrect: String concatenation (vulnerable to SQL injection)
const result = await Database.rawQuery(
  `SELECT * FROM users WHERE email = '${email}'`,
);
```

### XSS Prevention

```typescript
// app/middleware/security_middleware.ts
import type { HttpContext } from "@adonisjs/core/http";
import type { NextFn } from "@adonisjs/core/types/http";

export default class SecurityMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    // ✅ Correct: Set security headers
    ctx.response.header("X-Content-Type-Options", "nosniff");
    ctx.response.header("X-Frame-Options", "DENY");
    ctx.response.header("X-XSS-Protection", "1; mode=block");

    // ✅ Basic Content Security Policy
    ctx.response.header("Content-Security-Policy", "default-src 'self'");

    return await next();
  }
}
```

### CSRF Protection

```typescript
// app/middleware/csrf_middleware.ts
import type { HttpContext } from "@adonisjs/core/http";
import type { NextFn } from "@adonisjs/core/types/http";

export default class CsrfMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const { request, response, session } = ctx;

    // ✅ Generate CSRF token for safe methods
    if (["GET", "HEAD", "OPTIONS"].includes(request.method())) {
      const token = await this.generateToken();
      session.put("_csrf_token", token);
      response.header("X-CSRF-Token", token);
      return await next();
    }

    // ✅ Verify CSRF token for unsafe methods
    const sessionToken = session.get("_csrf_token");
    const requestToken =
      request.header("x-csrf-token") || request.input("_csrf_token");

    if (!sessionToken || !requestToken || sessionToken !== requestToken) {
      return response.forbidden({
        error: "CSRF token mismatch",
        code: "CSRF_TOKEN_MISMATCH",
      });
    }

    return await next();
  }

  private async generateToken(): Promise<string> {
    const crypto = await import("node:crypto");
    return crypto.randomBytes(32).toString("hex");
  }
}
```

### Rate Limiting

```typescript
// app/middleware/rate_limit_middleware.ts
import type { HttpContext } from "@adonisjs/core/http";
import type { NextFn } from "@adonisjs/core/types/http";
import redis from "@adonisjs/redis/services/main";

export default class RateLimitMiddleware {
  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: { max: number; window: number },
  ) {
    const { request, response } = ctx;
    const key = `rate_limit:${request.ip()}`;

    const current = await redis.get(key);
    const requests = current ? parseInt(current) : 0;

    if (requests >= options.max) {
      return response.tooManyRequests({
        error: "Too many requests",
      });
    }

    // Increment counter
    await redis.incr(key);
    await redis.expire(key, options.window);

    // Add rate limit headers
    response.header("X-RateLimit-Limit", options.max.toString());
    response.header(
      "X-RateLimit-Remaining",
      (options.max - requests - 1).toString(),
    );

    return await next();
  }
}
```

### File Upload Security

```typescript
// app/services/file_upload_service.ts
import { MultipartFile } from "@adonisjs/core/bodyparser";

export default class FileUploadService {
  private allowedMimeTypes = ["image/jpeg", "image/png", "application/pdf"];

  async uploadFile(file: MultipartFile): Promise<string> {
    // ✅ Validate file type
    if (!this.allowedMimeTypes.includes(file.type || "")) {
      throw new Error("File type not allowed");
    }

    // ✅ Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      throw new Error("File too large");
    }

    // ✅ Generate secure filename
    const filename = this.generateSecureFilename(file.extname || "");
    await file.move("uploads", { name: filename });

    return filename;
  }

  private generateSecureFilename(extension: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return `${timestamp}_${random}${extension}`;
  }
}
```

### Environment Security

```typescript
// start/env.ts
import { Env } from "@adonisjs/core/env";

export default await Env.create(new URL("../", import.meta.url), {
  // ✅ Environment validation
  NODE_ENV: Env.schema.enum(["development", "production", "test"] as const),
  APP_KEY: Env.schema.string(),
  DB_PASSWORD: Env.schema.string(),
  JWT_SECRET: Env.schema.string(),
});
```

### Secure Logging

```typescript
// app/services/audit_service.ts
import logger from "@adonisjs/core/services/logger";

export default class AuditService {
  // ✅ Log authentication attempts
  logAuthenticationAttempt(email: string, success: boolean) {
    logger.info("Authentication attempt", {
      email: this.maskEmail(email),
      success,
      timestamp: new Date().toISOString(),
    });
  }

  // ✅ Log data access
  logDataAccess(userId: number, resource: string, action: string) {
    logger.info("Data access", {
      userId,
      resource,
      action,
      timestamp: new Date().toISOString(),
    });
  }

  private maskEmail(email: string): string {
    const [username, domain] = email.split("@");
    return `${username.substring(0, 2)}***@${domain}`;
  }
}
```

### Security Headers

```typescript
// app/middleware/security_headers_middleware.ts
import type { HttpContext } from "@adonisjs/core/http";
import type { NextFn } from "@adonisjs/core/types/http";

export default class SecurityHeadersMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const { response } = ctx;

    // ✅ Basic security headers
    response.header("X-Content-Type-Options", "nosniff");
    response.header("X-Frame-Options", "DENY");
    response.header("X-XSS-Protection", "1; mode=block");

    // ✅ HTTPS enforcement in production
    if (ctx.request.secure()) {
      response.header("Strict-Transport-Security", "max-age=31536000");
    }

    return await next();
  }
}
```

### Common Security Anti-Patterns

```typescript
// ❌ Incorrect: Exposing sensitive information
return response.json({
  user: user, // Includes password hash and other sensitive data
  token: token
})

// ✅ Correct: Only expose necessary data
return response.json({
  user: {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  },
  token: token
})

// ❌ Incorrect: No input validation
async store({ request }: HttpContext) {
  const data = request.all() // Raw, unvalidated data
  return User.create(data)
}

// ✅ Correct: Always validate input
async store({ request }: HttpContext) {
  const data = await request.validateUsing(createUserValidator)
  return User.create(data)
}

// ❌ Incorrect: Logging sensitive data
logger.info('User login', { email, password, token })

// ✅ Correct: Log only non-sensitive data
logger.info('User login', {
  email: maskEmail(email),
  success: true,
  timestamp: new Date()
})

// ❌ Incorrect: Weak authentication
if (user.password === plainPassword) {
  // Never compare passwords directly
}

// ✅ Correct: Secure password verification
if (await user.verifyPassword(plainPassword)) {
  // Use proper password hashing/verification
}
```

### Security Checklist

#### Before Deployment

- [ ] All environment variables are validated
- [ ] APP_KEY is 32+ characters and unique per environment
- [ ] HTTPS is enforced in production
- [ ] Database credentials are secure and not default
- [ ] All user inputs are validated and sanitized
- [ ] File uploads are restricted and validated
- [ ] Rate limiting is implemented on sensitive endpoints
- [ ] CORS is properly configured
- [ ] Security headers are set
- [ ] Sensitive data is not logged
- [ ] Dependencies are up to date and vulnerability-free
- [ ] Database queries use parameterization
- [ ] Sessions are configured securely
- [ ] Error messages don't reveal sensitive information

### Sources

- [AdonisJS Security Guide](https://docs.adonisjs.com/guides/security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
