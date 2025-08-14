---
parent: adonisjs
name: Middleware
description: Guidelines for middleware usage and creation in AdonisJS 6
type: rule
---

## Middleware

### Middleware Structure

Middleware MUST be placed in `app/middleware/` and follow these patterns:

#### Basic Middleware Structure

```typescript
// app/middleware/auth_middleware.ts
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class AuthMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    // Downstream logic (before route handler)
    const { auth, response } = ctx
    
    try {
      await auth.check()
    } catch {
      return response.unauthorized({ error: 'Unauthorized access' })
    }

    // Continue to next middleware or route handler
    const result = await next()

    // Upstream logic (after route handler)
    // Optional: Modify response or perform cleanup
    
    return result
  }
}
```

#### Middleware with Parameters

```typescript
// app/middleware/role_middleware.ts
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class RoleMiddleware {
  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: { roles: string[] }
  ) {
    const { auth, response } = ctx
    const user = auth.getUserOrFail()

    if (!options.roles.includes(user.role)) {
      return response.forbidden({ 
        error: 'Insufficient permissions',
        required_roles: options.roles 
      })
    }

    return await next()
  }
}
```

### Middleware Registration

Middleware must be registered in `start/kernel.ts`:

```typescript
// start/kernel.ts
import router from '@adonisjs/core/services/router'
import server from '@adonisjs/core/services/server'

// ✅ Correct: Server middleware (runs on every request)
server.use([
  () => import('@adonisjs/cors/cors_middleware'),
  () => import('@adonisjs/static/static_middleware'),
])

// ✅ Correct: Router middleware (runs on matched routes)
router.use([
  () => import('@adonisjs/core/bodyparser_middleware'),
  () => import('@adonisjs/session/session_middleware'),
])

// ✅ Correct: Named middleware registration
export const middleware = router.named({
  auth: () => import('#middleware/auth_middleware'),
  guest: () => import('#middleware/guest_middleware'),
  role: () => import('#middleware/role_middleware'),
  throttle: () => import('#middleware/throttle_middleware'),
  cors: () => import('#middleware/cors_middleware'),
})
```

### Middleware Usage

```typescript
// start/routes.ts
import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'

// ✅ Correct: Single middleware
router.get('profile', '#controllers/users_controller.profile')
  .middleware([middleware.auth()])

// ✅ Correct: Multiple middleware
router.post('admin/users', '#controllers/admin/users_controller.store')
  .middleware([middleware.auth(), middleware.role({ roles: ['admin'] })])

// ✅ Correct: Route group with middleware
router.group(() => {
  router.resource('posts', '#controllers/posts_controller')
  router.resource('comments', '#controllers/comments_controller')
}).prefix('api').middleware([middleware.auth()])

// ✅ Correct: Conditional middleware
router.get('public-data', '#controllers/data_controller.public')
  .middleware([middleware.throttle({ max: 100, duration: '1m' })])
```

### Common Middleware Patterns

#### Authentication Middleware

```typescript
// app/middleware/auth_middleware.ts
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class AuthMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const { auth, response } = ctx

    try {
      await auth.check()
      
      // Optional: Add user to context for easy access
      ctx.user = auth.user!
      
    } catch {
      return response.unauthorized({
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      })
    }

    return await next()
  }
}
```

#### Rate Limiting Middleware

```typescript
// app/middleware/throttle_middleware.ts
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import redis from '@adonisjs/redis/services/main'

export default class ThrottleMiddleware {
  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: { max: number; duration: string }
  ) {
    const { request, response } = ctx
    const key = `throttle:${request.ip()}:${request.url()}`
    
    const attempts = await redis.get(key)
    const maxAttempts = options.max
    
    if (attempts && parseInt(attempts) >= maxAttempts) {
      return response.tooManyRequests({
        error: 'Rate limit exceeded'
      })
    }

    // Increment counter
    const ttl = options.duration === '1h' ? 3600 : 60 // Simple duration parsing
    await redis.setex(key, ttl, attempts ? parseInt(attempts) + 1 : 1)

    const result = await next()

    // Add rate limit headers
    response.header('X-RateLimit-Limit', maxAttempts.toString())
    response.header('X-RateLimit-Remaining', 
      (maxAttempts - parseInt(attempts || '0') - 1).toString())

    return result
  }
}
```

#### CORS Middleware

```typescript
// app/middleware/cors_middleware.ts
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class CorsMiddleware {
  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: {
      origin?: string
      methods?: string[]
    } = {}
  ) {
    const { request, response } = ctx
    
    // Set CORS headers
    response.header('Access-Control-Allow-Origin', options.origin || '*')
    response.header('Access-Control-Allow-Methods', 
      options.methods?.join(', ') || 'GET, POST, PUT, DELETE')
    response.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    // Handle preflight requests
    if (request.method() === 'OPTIONS') {
      return response.status(204).send('')
    }

    return await next()
  }
}
```

#### Logging Middleware

```typescript
// app/middleware/logger_middleware.ts
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import logger from '@adonisjs/core/services/logger'

export default class LoggerMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const { request } = ctx
    const startTime = Date.now()
    
    // Log incoming request
    logger.info('Request started', {
      method: request.method(),
      url: request.url(),
      ip: request.ip()
    })

    try {
      const result = await next()
      
      // Log successful response
      const duration = Date.now() - startTime
      logger.info('Request completed', {
        method: request.method(),
        url: request.url(),
        status: ctx.response.getStatus(),
        duration: `${duration}ms`
      })

      return result
    } catch (error) {
      // Log error
      logger.error('Request failed', {
        method: request.method(),
        url: request.url(),
        error: error.message
      })
      
      throw error
    }
  }
}
```

#### Validation Middleware

```typescript
// app/middleware/validate_middleware.ts
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import vine from '@vinejs/vine'

export default class ValidateMiddleware {
  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: { schema: any }
  ) {
    const { request, response } = ctx
    
    try {
      const validatedData = await vine.validate({
        schema: options.schema,
        data: request.all()
      })

      // Add validated data to context
      ctx.validatedData = validatedData

    } catch (error) {
      return response.badRequest({
        error: 'Validation failed',
        messages: error.messages
      })
    }

    return await next()
  }
}
```

### Middleware Testing

```typescript
// tests/unit/middleware/auth_middleware.spec.ts
import { test } from '@japa/runner'
import { HttpContextFactory } from '@adonisjs/core/factories/http'
import AuthMiddleware from '#middleware/auth_middleware'

test.group('Auth Middleware', () => {
  test('should allow authenticated users', async ({ assert }) => {
    const ctx = new HttpContextFactory().create()
    const middleware = new AuthMiddleware()
    
    // Mock authenticated user
    ctx.auth.user = { id: 1, email: 'test@example.com' }
    ctx.auth.check = async () => true

    let nextCalled = false
    const next = async () => {
      nextCalled = true
      return 'success'
    }

    const result = await middleware.handle(ctx, next)

    assert.isTrue(nextCalled)
    assert.equal(result, 'success')
  })

  test('should reject unauthenticated users', async ({ assert }) => {
    const ctx = new HttpContextFactory().create()
    const middleware = new AuthMiddleware()
    
    // Mock unauthenticated user
    ctx.auth.check = async () => { 
      throw new Error('Unauthenticated') 
    }

    let nextCalled = false
    const next = async () => {
      nextCalled = true
      return 'success'
    }

    await middleware.handle(ctx, next)

    assert.isFalse(nextCalled)
    assert.equal(ctx.response.getStatus(), 401)
  })
})
```

### Middleware Best Practices

#### DO's

- ALWAYS use TypeScript types for middleware parameters
- ALWAYS handle errors gracefully
- ALWAYS call `await next()` to continue the chain
- ALWAYS use dependency injection for services
- ALWAYS add appropriate response headers
- ALWAYS validate middleware options
- ALWAYS test middleware thoroughly

#### DON'Ts

```typescript
// ❌ Incorrect: Not calling next()
async handle(ctx: HttpContext, next: NextFn) {
  // Logic here
  // Missing: await next()
}

// ❌ Incorrect: Not handling errors
async handle(ctx: HttpContext, next: NextFn) {
  await auth.check() // Can throw error
  return await next()
}

// ❌ Incorrect: Blocking I/O operations
async handle(ctx: HttpContext, next: NextFn) {
  // Synchronous file operation
  const data = fs.readFileSync('/path/to/file')
  return await next()
}

// ❌ Incorrect: Not typing parameters
async handle(ctx: any, next: any, options?: any) {
  // No type safety
}
```

### Global vs Named Middleware

```typescript
// ✅ Correct: Use server middleware for cross-cutting concerns
server.use([
  () => import('@adonisjs/cors/cors_middleware'),    // CORS for all routes
  () => import('#middleware/logger_middleware'),      // Logging for all requests
])

// ✅ Correct: Use router middleware for route-specific logic
router.use([
  () => import('@adonisjs/core/bodyparser_middleware'), // Parse request body
  () => import('@adonisjs/session/session_middleware'), // Session handling
])

// ✅ Correct: Use named middleware for optional features
export const middleware = router.named({
  auth: () => import('#middleware/auth_middleware'),     // Authentication
  admin: () => import('#middleware/admin_middleware'),   // Admin access
  throttle: () => import('#middleware/throttle_middleware'), // Rate limiting
})
```

### Sources

- [Middleware Documentation](https://docs.adonisjs.com/guides/middleware)
- [HTTP Context](https://docs.adonisjs.com/guides/context)
- [Middleware Testing](https://docs.adonisjs.com/guides/testing)