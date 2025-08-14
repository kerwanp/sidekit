---
parent: honojs
name: Error Handling
description: Exception handling and error responses
type: rule
---

## Error Handling

### Rules

- ALWAYS use `HTTPException` for HTTP-related errors
- NEVER throw plain `Error` objects in route handlers
- Custom error handlers MUST be defined using `app.onError()`
- Error messages MUST be clear and actionable
- Sensitive information MUST NEVER be exposed in error messages
- Different error types MUST return appropriate HTTP status codes
- Error responses MUST follow a consistent format
- Validation errors MUST return 400 status code
- Authentication errors MUST return 401 status code
- Authorization errors MUST return 403 status code
- Not found errors MUST return 404 status code

### HTTPException Usage

```typescript
import { HTTPException } from 'hono/http-exception'

// Basic HTTPException
app.get('/users/:id', async (c) => {
  const id = c.req.param('id')
  const user = await findUser(id)
  
  if (!user) {
    throw new HTTPException(404, {
      message: `User with ID ${id} not found`
    })
  }
  
  return c.json(user)
})

// Authentication error
app.post('/admin', async (c) => {
  const token = c.req.header('Authorization')
  
  if (!token) {
    throw new HTTPException(401, {
      message: 'Authentication required'
    })
  }
  
  if (!isValidToken(token)) {
    throw new HTTPException(401, {
      message: 'Invalid or expired token'
    })
  }
  
  return c.json({ success: true })
})

// Custom response with HTTPException
app.get('/protected', (c) => {
  const errorResponse = new Response('Unauthorized', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Bearer realm="api"'
    }
  })
  
  throw new HTTPException(401, { res: errorResponse })
})

// With error cause
app.post('/process', async (c) => {
  try {
    await processData()
  } catch (error) {
    throw new HTTPException(500, {
      message: 'Processing failed',
      cause: error
    })
  }
})
```

### Global Error Handler

```typescript
import { HTTPException } from 'hono/http-exception'
import { ZodError } from 'zod'

app.onError((err, c) => {
  // Handle HTTPException
  if (err instanceof HTTPException) {
    return err.getResponse()
  }
  
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return c.json(
      {
        error: 'Validation failed',
        issues: err.issues.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message
        }))
      },
      400
    )
  }
  
  // Handle database errors
  if (err.name === 'DatabaseError') {
    console.error('Database error:', err)
    return c.json(
      { error: 'Database operation failed' },
      503
    )
  }
  
  // Log unexpected errors
  console.error('Unexpected error:', err)
  
  // Generic error response (don't expose internals)
  return c.json(
    {
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' 
        ? err.message 
        : 'An unexpected error occurred'
    },
    500
  )
})
```

### Custom Error Classes

```typescript
// src/lib/errors.ts
import { HTTPException } from 'hono/http-exception'

export class ValidationError extends HTTPException {
  constructor(message: string, details?: any) {
    super(400, { message })
    this.name = 'ValidationError'
    this.details = details
  }
  details?: any
}

export class AuthenticationError extends HTTPException {
  constructor(message = 'Authentication required') {
    super(401, { message })
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends HTTPException {
  constructor(message = 'Insufficient permissions') {
    super(403, { message })
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends HTTPException {
  constructor(resource: string, id?: string) {
    const message = id 
      ? `${resource} with ID ${id} not found`
      : `${resource} not found`
    super(404, { message })
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends HTTPException {
  constructor(message: string) {
    super(409, { message })
    this.name = 'ConflictError'
  }
}

export class RateLimitError extends HTTPException {
  constructor(retryAfter?: number) {
    const headers = retryAfter 
      ? { 'Retry-After': retryAfter.toString() }
      : undefined
    
    super(429, {
      message: 'Too many requests',
      res: new Response('Too many requests', {
        status: 429,
        headers
      })
    })
    this.name = 'RateLimitError'
  }
}

// Usage
app.get('/users/:id', async (c) => {
  const id = c.req.param('id')
  const user = await findUser(id)
  
  if (!user) {
    throw new NotFoundError('User', id)
  }
  
  return c.json(user)
})

app.post('/users', async (c) => {
  const data = await c.req.json()
  
  if (await userExists(data.email)) {
    throw new ConflictError('User with this email already exists')
  }
  
  const user = await createUser(data)
  return c.json(user, 201)
})
```

### Error Response Formatting

```typescript
// Consistent error response format
interface ErrorResponse {
  error: {
    code: string
    message: string
    details?: any
    timestamp: string
    path: string
    requestId?: string
  }
}

app.onError((err, c) => {
  const requestId = c.get('requestId') // From request ID middleware
  
  let status = 500
  let code = 'INTERNAL_ERROR'
  let message = 'An unexpected error occurred'
  let details = undefined
  
  if (err instanceof HTTPException) {
    status = err.status
    code = err.name.toUpperCase().replace('ERROR', '')
    message = err.message
    details = (err as any).details
  } else if (err instanceof ZodError) {
    status = 400
    code = 'VALIDATION_ERROR'
    message = 'Request validation failed'
    details = err.flatten()
  }
  
  const errorResponse: ErrorResponse = {
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      path: c.req.path,
      requestId
    }
  }
  
  return c.json(errorResponse, status)
})
```

### Async Error Handling

```typescript
// Async error handling in middleware
app.use('*', async (c, next) => {
  try {
    await next()
  } catch (error) {
    // Log the error
    console.error('Request failed:', {
      path: c.req.path,
      method: c.req.method,
      error
    })
    
    // Re-throw to be handled by onError
    throw error
  }
})

// Async operation with proper error handling
app.post('/import', async (c) => {
  const file = await c.req.formData()
  
  try {
    const result = await importData(file)
    return c.json({ success: true, result })
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error // Re-throw known errors
    }
    
    // Wrap unknown errors
    throw new HTTPException(500, {
      message: 'Import failed',
      cause: error
    })
  }
})
```

### Error Recovery Strategies

```typescript
// Retry with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: any
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (i < maxRetries - 1) {
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, i) * 1000)
        )
      }
    }
  }
  
  throw new HTTPException(503, {
    message: 'Service temporarily unavailable',
    cause: lastError
  })
}

app.get('/external-data', async (c) => {
  const data = await withRetry(() => fetchExternalData())
  return c.json(data)
})

// Circuit breaker pattern
class CircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private state: 'closed' | 'open' | 'half-open' = 'closed'
  
  constructor(
    private threshold = 5,
    private timeout = 60000
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open'
      } else {
        throw new HTTPException(503, {
          message: 'Service circuit breaker is open'
        })
      }
    }
    
    try {
      const result = await fn()
      if (this.state === 'half-open') {
        this.state = 'closed'
        this.failures = 0
      }
      return result
    } catch (error) {
      this.failures++
      this.lastFailureTime = Date.now()
      
      if (this.failures >= this.threshold) {
        this.state = 'open'
      }
      
      throw error
    }
  }
}

const breaker = new CircuitBreaker()

app.get('/protected-resource', async (c) => {
  const data = await breaker.execute(() => fetchProtectedResource())
  return c.json(data)
})
```

### Sources

- [Exception Documentation](https://hono.dev/docs/api/exception)
- [Error Handling Best Practices](https://hono.dev/docs/guides/best-practices)
- [HTTPException API](https://hono.dev/docs/api/exception#httpexception)