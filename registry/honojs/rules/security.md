---
parent: honojs
name: Security
description: Security middleware and best practices
type: rule
---

## Security

### Rules

- Security headers MUST be implemented using secure-headers middleware
- CORS MUST be properly configured for production environments
- CSRF protection MUST be enabled for state-changing operations
- Authentication MUST be implemented for protected routes
- Input validation MUST be performed on all user inputs
- Sensitive data MUST NEVER be logged or exposed in responses
- Rate limiting SHOULD be implemented for public APIs
- Content Security Policy (CSP) SHOULD be configured
- HTTPS MUST be enforced in production
- JWT secrets and API keys MUST be stored in environment variables

### Security Headers

```typescript
import { secureHeaders } from 'hono/secure-headers'

// Basic security headers
app.use('*', secureHeaders())

// Custom security headers configuration
app.use('*', secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.example.com'],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'"],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
  },
  crossOriginEmbedderPolicy: 'require-corp',
  crossOriginOpenerPolicy: 'same-origin',
  crossOriginResourcePolicy: 'same-origin',
  originAgentCluster: '?1',
  referrerPolicy: 'no-referrer',
  strictTransportSecurity: 'max-age=15552000; includeSubDomains',
  xContentTypeOptions: 'nosniff',
  xDnsPrefetchControl: 'off',
  xDownloadOptions: 'noopen',
  xFrameOptions: 'SAMEORIGIN',
  xPermittedCrossDomainPolicies: 'none',
  xXssProtection: '0',
  permissionsPolicy: {
    camera: ['none'],
    microphone: ['none'],
    geolocation: ['none']
  }
}))
```

### CORS Configuration

```typescript
import { cors } from 'hono/cors'

// Development CORS (permissive)
if (process.env.NODE_ENV === 'development') {
  app.use('*', cors())
}

// Production CORS (restrictive)
app.use('*', cors({
  origin: (origin) => {
    const allowedOrigins = [
      'https://app.example.com',
      'https://www.example.com'
    ]
    return allowedOrigins.includes(origin) ? origin : null
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposeHeaders: ['X-Response-Time', 'X-Request-ID'],
  maxAge: 86400,
  credentials: true
}))

// API-specific CORS
app.use('/api/*', cors({
  origin: 'https://app.example.com',
  credentials: true
}))
```

### CSRF Protection

```typescript
import { csrf } from 'hono/csrf'

// CSRF protection for state-changing operations
app.use('*', csrf({
  origin: ['https://example.com', 'https://app.example.com']
}))

// Custom CSRF configuration
app.use('*', csrf({
  origin: (origin) => {
    return origin.endsWith('.example.com')
  }
}))

// Exclude certain routes from CSRF
app.use('*', async (c, next) => {
  // Skip CSRF for webhooks
  if (c.req.path.startsWith('/webhooks/')) {
    return next()
  }
  
  return csrf({
    origin: 'https://example.com'
  })(c, next)
})
```

### Authentication & Authorization

```typescript
import { sign, verify } from 'hono/jwt'
import { bearerAuth } from 'hono/bearer-auth'
import { basicAuth } from 'hono/basic-auth'

// JWT Authentication
const jwtMiddleware = async (c: Context, next: Next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  
  if (!token) {
    throw new HTTPException(401, { message: 'Token required' })
  }
  
  try {
    const payload = await verify(token, c.env.JWT_SECRET)
    c.set('userId', payload.sub)
    c.set('user', payload)
    await next()
  } catch (error) {
    throw new HTTPException(401, { message: 'Invalid token' })
  }
}

// Bearer Token Authentication
app.use('/api/*', bearerAuth({
  verifyToken: async (token, c) => {
    // Verify token against database or cache
    const valid = await verifyApiToken(token)
    return valid
  }
}))

// Basic Authentication for admin routes
app.use('/admin/*', basicAuth({
  username: process.env.ADMIN_USERNAME,
  password: process.env.ADMIN_PASSWORD,
  realm: 'Admin Area',
  invalidUserMessage: 'Invalid credentials'
}))

// Role-based authorization
const requireRole = (role: string) => {
  return async (c: Context, next: Next) => {
    const user = c.get('user')
    
    if (!user || user.role !== role) {
      throw new HTTPException(403, { 
        message: 'Insufficient permissions' 
      })
    }
    
    await next()
  }
}

app.get('/admin/users', 
  jwtMiddleware,
  requireRole('admin'),
  (c) => c.json({ users: [] })
)
```

### Rate Limiting

```typescript
// Simple in-memory rate limiter
const rateLimits = new Map<string, number[]>()

const rateLimit = (options: {
  windowMs: number
  max: number
  keyGenerator?: (c: Context) => string
}) => {
  return async (c: Context, next: Next) => {
    const key = options.keyGenerator?.(c) || 
      c.req.header('x-forwarded-for') || 
      'global'
    
    const now = Date.now()
    const windowStart = now - options.windowMs
    
    const requests = rateLimits.get(key) || []
    const recentRequests = requests.filter(time => time > windowStart)
    
    if (recentRequests.length >= options.max) {
      const retryAfter = Math.ceil(
        (recentRequests[0] + options.windowMs - now) / 1000
      )
      
      c.header('X-RateLimit-Limit', options.max.toString())
      c.header('X-RateLimit-Remaining', '0')
      c.header('X-RateLimit-Reset', new Date(
        recentRequests[0] + options.windowMs
      ).toISOString())
      c.header('Retry-After', retryAfter.toString())
      
      return c.json(
        { error: 'Too many requests' },
        429
      )
    }
    
    recentRequests.push(now)
    rateLimits.set(key, recentRequests)
    
    c.header('X-RateLimit-Limit', options.max.toString())
    c.header('X-RateLimit-Remaining', 
      (options.max - recentRequests.length).toString()
    )
    
    await next()
  }
}

// Apply rate limiting
app.use('/api/*', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  keyGenerator: (c) => {
    // Rate limit by API key or IP
    return c.req.header('X-API-Key') || 
           c.req.header('x-forwarded-for') || 
           'anonymous'
  }
}))

// Stricter rate limit for auth endpoints
app.use('/auth/*', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5 // Only 5 attempts per 15 minutes
}))
```

### Input Sanitization

```typescript
import DOMPurify from 'isomorphic-dompurify'

// HTML sanitization middleware
const sanitizeHtml = async (c: Context, next: Next) => {
  if (c.req.method === 'POST' || c.req.method === 'PUT') {
    const contentType = c.req.header('content-type')
    
    if (contentType?.includes('application/json')) {
      const body = await c.req.json()
      
      // Recursively sanitize all string values
      const sanitize = (obj: any): any => {
        if (typeof obj === 'string') {
          return DOMPurify.sanitize(obj)
        }
        if (Array.isArray(obj)) {
          return obj.map(sanitize)
        }
        if (obj && typeof obj === 'object') {
          return Object.keys(obj).reduce((acc, key) => {
            acc[key] = sanitize(obj[key])
            return acc
          }, {} as any)
        }
        return obj
      }
      
      c.req.json = async () => sanitize(body)
    }
  }
  
  await next()
}

app.use('*', sanitizeHtml)

// SQL injection prevention (use parameterized queries)
app.get('/users', async (c) => {
  const name = c.req.query('name')
  
  // NEVER do this:
  // const users = await db.query(`SELECT * FROM users WHERE name = '${name}'`)
  
  // DO this instead:
  const users = await db.query(
    'SELECT * FROM users WHERE name = ?',
    [name]
  )
  
  return c.json(users)
})
```

### Secret Management

```typescript
// Environment variable validation
const validateEnv = () => {
  const required = [
    'JWT_SECRET',
    'DATABASE_URL',
    'API_KEY',
    'ENCRYPTION_KEY'
  ]
  
  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    )
  }
  
  // Validate secret strength
  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters')
  }
}

// Call during app initialization
validateEnv()

// Secure cookie configuration
import { setCookie } from 'hono/cookie'

app.post('/auth/login', async (c) => {
  const token = await generateToken()
  
  setCookie(c, 'token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: '/'
  })
  
  return c.json({ success: true })
})
```

### Security Monitoring

```typescript
// Security event logging
const securityLogger = async (c: Context, next: Next) => {
  const start = Date.now()
  
  try {
    await next()
  } catch (error) {
    if (error instanceof HTTPException) {
      if (error.status === 401 || error.status === 403) {
        // Log security events
        console.warn('Security event:', {
          type: error.status === 401 ? 'authentication' : 'authorization',
          path: c.req.path,
          method: c.req.method,
          ip: c.req.header('x-forwarded-for'),
          userAgent: c.req.header('user-agent'),
          timestamp: new Date().toISOString()
        })
      }
    }
    throw error
  }
  
  // Log suspicious activity
  const duration = Date.now() - start
  if (duration > 5000) {
    console.warn('Slow request detected:', {
      path: c.req.path,
      duration,
      ip: c.req.header('x-forwarded-for')
    })
  }
}

app.use('*', securityLogger)
```

### Sources

- [Security Headers](https://hono.dev/docs/middleware/builtin/secure-headers)
- [CORS Middleware](https://hono.dev/docs/middleware/builtin/cors)
- [CSRF Protection](https://hono.dev/docs/middleware/builtin/csrf)
- [JWT Authentication](https://hono.dev/docs/middleware/builtin/jwt)
- [OWASP Security Guidelines](https://owasp.org/www-project-top-ten/)