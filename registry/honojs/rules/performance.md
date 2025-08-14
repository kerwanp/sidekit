---
parent: honojs
name: Performance
description: Optimization, caching, and compression
type: rule
---

## Performance

### Rules

- Response compression MUST be enabled for production
- Static assets SHOULD be cached with appropriate headers
- Database queries MUST be optimized and use connection pooling
- Large payloads SHOULD be paginated
- ETags SHOULD be used for conditional requests
- Response time SHOULD be monitored
- Memory usage MUST be monitored in production
- Streaming SHOULD be used for large responses
- Unnecessary middleware MUST NOT be used in production
- Routes MUST be ordered by specificity for optimal matching

### Compression

```typescript
import { compress } from 'hono/compress'

// Enable gzip/deflate compression
app.use('*', compress())

// Custom compression options
app.use('*', compress({
  encoding: 'gzip', // or 'deflate', 'br'
}))

// Conditional compression
app.use('*', async (c, next) => {
  const path = c.req.path
  
  // Don't compress images and videos
  if (path.match(/\.(jpg|jpeg|png|gif|webp|mp4|webm)$/i)) {
    return next()
  }
  
  return compress()(c, next)
})
```

### Caching Strategies

```typescript
import { cache } from 'hono/cache'
import { etag } from 'hono/etag'

// Browser caching with Cache-Control headers
app.use('/static/*', async (c, next) => {
  await next()
  
  // Cache static assets for 1 year
  c.header('Cache-Control', 'public, max-age=31536000, immutable')
})

app.use('/api/*', async (c, next) => {
  await next()
  
  // Cache API responses for 5 minutes
  c.header('Cache-Control', 'public, max-age=300, s-maxage=300')
})

// ETag support for conditional requests
app.use('*', etag())

// Edge caching (Cloudflare Workers)
app.get('/cached-data',
  cache({
    cacheName: 'my-app-cache',
    cacheControl: 'max-age=3600',
    wait: true,
    vary: ['Accept-Encoding', 'Accept-Language']
  }),
  async (c) => {
    const data = await fetchExpensiveData()
    return c.json(data)
  }
)

// Custom in-memory cache
const memoryCache = new Map<string, { data: any; expires: number }>()

const withCache = (ttl: number) => {
  return async (c: Context, next: Next) => {
    const key = `${c.req.method}:${c.req.url}`
    const cached = memoryCache.get(key)
    
    if (cached && cached.expires > Date.now()) {
      return c.json(cached.data)
    }
    
    await next()
    
    if (c.res.status === 200) {
      const data = await c.res.json()
      memoryCache.set(key, {
        data,
        expires: Date.now() + ttl * 1000
      })
      return c.json(data)
    }
  }
}

app.get('/expensive-operation', 
  withCache(300), // Cache for 5 minutes
  async (c) => {
    const result = await performExpensiveOperation()
    return c.json(result)
  }
)
```

### Response Streaming

```typescript
// Stream large JSON responses
app.get('/large-dataset', async (c) => {
  return c.streamText(async (stream) => {
    await stream.write('[')
    
    for (let i = 0; i < 10000; i++) {
      if (i > 0) await stream.write(',')
      
      const item = await fetchItem(i)
      await stream.write(JSON.stringify(item))
      
      // Yield control periodically
      if (i % 100 === 0) {
        await stream.sleep(0)
      }
    }
    
    await stream.write(']')
  })
})

// Server-Sent Events (SSE)
app.get('/events', async (c) => {
  return c.streamText(async (stream) => {
    stream.header('Content-Type', 'text/event-stream')
    stream.header('Cache-Control', 'no-cache')
    stream.header('Connection', 'keep-alive')
    
    while (true) {
      const event = await getNextEvent()
      
      if (event) {
        await stream.write(`data: ${JSON.stringify(event)}\n\n`)
      }
      
      await stream.sleep(1000)
    }
  })
})

// Stream file downloads
app.get('/download/:file', async (c) => {
  const fileName = c.req.param('file')
  const fileStream = await getFileStream(fileName)
  
  c.header('Content-Type', 'application/octet-stream')
  c.header('Content-Disposition', `attachment; filename="${fileName}"`)
  
  return c.body(fileStream)
})
```

### Database Optimization

```typescript
// Connection pooling example
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum number of clients
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Use prepared statements
const getUserById = async (id: string) => {
  const query = {
    text: 'SELECT * FROM users WHERE id = $1',
    values: [id],
    name: 'get-user-by-id' // Named query for caching
  }
  
  const result = await pool.query(query)
  return result.rows[0]
}

// Batch operations
app.post('/users/batch', async (c) => {
  const users = await c.req.json()
  
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    
    const results = await Promise.all(
      users.map(user => 
        client.query(
          'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
          [user.name, user.email]
        )
      )
    )
    
    await client.query('COMMIT')
    return c.json(results.map(r => r.rows[0]), 201)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
})
```

### Pagination

```typescript
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  cursor: z.string().optional()
})

// Offset-based pagination
app.get('/users',
  zValidator('query', paginationSchema),
  async (c) => {
    const { page, limit } = c.req.valid('query')
    const offset = (page - 1) * limit
    
    const [users, totalCount] = await Promise.all([
      getUsersPaginated(offset, limit),
      getUsersCount()
    ])
    
    const totalPages = Math.ceil(totalCount / limit)
    
    return c.json({
      data: users,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    })
  }
)

// Cursor-based pagination
app.get('/posts',
  zValidator('query', paginationSchema),
  async (c) => {
    const { limit, cursor } = c.req.valid('query')
    
    const posts = await getPostsAfterCursor(cursor, limit + 1)
    const hasMore = posts.length > limit
    
    if (hasMore) {
      posts.pop() // Remove the extra item
    }
    
    const nextCursor = hasMore ? posts[posts.length - 1].id : null
    
    return c.json({
      data: posts,
      pagination: {
        limit,
        nextCursor,
        hasMore
      }
    })
  }
)
```

### Performance Monitoring

```typescript
import { timing } from 'hono/timing'

// Add Server-Timing header
app.use('*', timing())

// Custom performance monitoring
const performanceMonitor = async (c: Context, next: Next) => {
  const start = performance.now()
  const startMemory = process.memoryUsage()
  
  await next()
  
  const duration = performance.now() - start
  const endMemory = process.memoryUsage()
  
  // Add performance headers
  c.header('X-Response-Time', `${duration.toFixed(2)}ms`)
  c.header('X-Memory-Used', `${(
    (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024
  ).toFixed(2)}MB`)
  
  // Log slow requests
  if (duration > 1000) {
    console.warn('Slow request detected:', {
      path: c.req.path,
      method: c.req.method,
      duration: `${duration.toFixed(2)}ms`,
      memoryDelta: `${(
        (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024
      ).toFixed(2)}MB`
    })
  }
}

app.use('*', performanceMonitor)

// Request coalescing for identical requests
const requestCache = new Map<string, Promise<any>>()

const coalesceRequests = (key: string, fn: () => Promise<any>) => {
  const existing = requestCache.get(key)
  if (existing) return existing
  
  const promise = fn().finally(() => {
    requestCache.delete(key)
  })
  
  requestCache.set(key, promise)
  return promise
}

app.get('/expensive/:id', async (c) => {
  const id = c.req.param('id')
  
  const data = await coalesceRequests(
    `expensive:${id}`,
    () => fetchExpensiveData(id)
  )
  
  return c.json(data)
})
```

### Lazy Loading & Code Splitting

```typescript
// Lazy load heavy dependencies
let heavyLibrary: any

const getHeavyLibrary = async () => {
  if (!heavyLibrary) {
    heavyLibrary = await import('heavy-library')
  }
  return heavyLibrary
}

app.post('/process-image', async (c) => {
  const lib = await getHeavyLibrary()
  const image = await c.req.blob()
  const processed = await lib.processImage(image)
  return c.body(processed)
})

// Conditional middleware loading
if (process.env.NODE_ENV === 'production') {
  const { monitor } = await import('./middleware/monitor')
  app.use('*', monitor())
}
```

### Resource Optimization

```typescript
// Optimize JSON serialization
app.get('/data', async (c) => {
  const data = await getData()
  
  // Use streaming for large arrays
  if (Array.isArray(data) && data.length > 1000) {
    return c.streamText(async (stream) => {
      stream.header('Content-Type', 'application/json')
      await stream.write('[')
      
      for (let i = 0; i < data.length; i++) {
        if (i > 0) await stream.write(',')
        await stream.write(JSON.stringify(data[i]))
      }
      
      await stream.write(']')
    })
  }
  
  return c.json(data)
})

// Debounce/throttle expensive operations
const throttle = (fn: Function, delay: number) => {
  let lastCall = 0
  return (...args: any[]) => {
    const now = Date.now()
    if (now - lastCall < delay) {
      return Promise.resolve({ throttled: true })
    }
    lastCall = now
    return fn(...args)
  }
}

const expensiveOperation = throttle(
  async (data: any) => {
    // Expensive computation
    return processData(data)
  },
  1000 // Max once per second
)

app.post('/process', async (c) => {
  const data = await c.req.json()
  const result = await expensiveOperation(data)
  return c.json(result)
})
```

### Sources

- [Performance Best Practices](https://hono.dev/docs/guides/best-practices)
- [Compression Middleware](https://hono.dev/docs/middleware/builtin/compress)
- [Cache Middleware](https://hono.dev/docs/middleware/builtin/cache)
- [Timing Middleware](https://hono.dev/docs/middleware/builtin/timing)