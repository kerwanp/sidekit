---
parent: adonisjs
name: Performance
description: Performance optimization guidelines for AdonisJS 6
type: rule
---

## Performance Optimization

### Database Performance

#### Query Optimization

```typescript
// ✅ Correct: Efficient database queries
export default class PostService {
  // Use eager loading to prevent N+1 queries
  async getPostsWithAuthors() {
    return await Post.query()
      .preload('author')
      .preload('comments', (query) => {
        query.preload('user')
        query.orderBy('createdAt', 'desc')
        query.limit(5)
      })
      .orderBy('createdAt', 'desc')
      .limit(20)
  }

  // Use pagination for large datasets
  async getPostsPaginated(page: number, limit: number = 20) {
    return await Post.query()
      .preload('author', (query) => {
        query.select(['id', 'name', 'avatar'])
      })
      .paginate(page, limit)
  }

  // Use specific columns selection
  async getPostTitles() {
    return await Post.query()
      .select(['id', 'title', 'slug', 'publishedAt'])
      .where('published', true)
      .orderBy('publishedAt', 'desc')
  }

  // Use database-level aggregation
  async getPostStats() {
    return await Post.query()
      .count('* as total')
      .countDistinct('userId as unique_authors')
      .where('published', true)
      .first()
  }
}
```

#### Database Indexing

```sql
-- ✅ Create indexes for frequently queried columns
CREATE INDEX idx_posts_published ON posts(published);
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at);

-- ✅ Composite indexes for complex queries
CREATE INDEX idx_posts_published_created ON posts(published, created_at);
CREATE INDEX idx_users_email_active ON users(email, is_active);

-- ✅ Partial indexes for better performance
CREATE INDEX idx_posts_published_only ON posts(created_at) WHERE published = true;
```

#### Connection Pooling

```typescript
// config/database.ts
export default {
  connection: 'pg',
  connections: {
    pg: {
      client: 'pg',
      connection: {
        host: env.get('DB_HOST'),
        port: env.get('DB_PORT'),
        user: env.get('DB_USER'),
        password: env.get('DB_PASSWORD'),
        database: env.get('DB_DATABASE'),
      },
      // ✅ Optimize connection pool
      pool: {
        min: 2,
        max: 10,
        acquireTimeoutMillis: 60000,
        createTimeoutMillis: 30000,
        destroyTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 100,
      },
      // ✅ Enable debugging in development only
      debug: env.get('NODE_ENV') === 'development',
    }
  }
}
```

### Caching Strategies

#### Redis Caching

```typescript
// app/services/cache_service.ts
import redis from '@adonisjs/redis/services/main'

export default class CacheService {
  // ✅ Cache user data
  async getUser(id: number): Promise<User | null> {
    const cacheKey = `user:${id}`
    
    // Try cache first
    const cached = await redis.get(cacheKey)
    if (cached) {
      return JSON.parse(cached)
    }

    // Get from database and cache
    const user = await User.find(id)
    if (user) {
      await redis.setex(cacheKey, 3600, JSON.stringify(user))
    }

    return user
  }

  // ✅ Cache popular posts
  async getPopularPosts(): Promise<Post[]> {
    const cacheKey = 'posts:popular'
    
    const cached = await redis.get(cacheKey)
    if (cached) {
      return JSON.parse(cached)
    }

    const posts = await Post.query()
      .preload('author')
      .orderBy('views', 'desc')
      .limit(10)

    await redis.setex(cacheKey, 900, JSON.stringify(posts))
    return posts
  }

  // ✅ Cache invalidation
  async invalidateUserCache(userId: number) {
    await redis.del(`user:${userId}`)
  }
}
```

#### HTTP Response Caching

```typescript
// app/middleware/cache_middleware.ts
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import redis from '@adonisjs/redis/services/main'

export default class CacheMiddleware {
  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: { ttl?: number } = {}
  ) {
    const { request, response } = ctx
    
    // Only cache GET requests
    if (request.method() !== 'GET') {
      return await next()
    }

    const cacheKey = `http:${request.url()}`
    const ttl = options.ttl || 300 // 5 minutes

    // Check cache
    const cached = await redis.get(cacheKey)
    if (cached) {
      response.header('X-Cache', 'HIT')
      return response.json(JSON.parse(cached))
    }

    // Execute request
    const result = await next()

    // Cache 200 responses
    if (response.getStatus() === 200) {
      await redis.setex(cacheKey, ttl, JSON.stringify(response.getBody()))
      response.header('X-Cache', 'MISS')
    }

    return result
  }
}
```

### Memory Optimization

```typescript
// ✅ Use Maps for caching
export default class UserService {
  private userCache = new Map<number, User>()

  async getUserByEmail(email: string): Promise<User | null> {
    const user = await User.findBy('email', email)
    if (user) {
      this.userCache.set(user.id, user)
    }
    return user
  }

  // ✅ Clean up cache periodically
  private cleanupCache() {
    if (this.userCache.size > 1000) {
      this.userCache.clear()
    }
  }
}
```

#### Streaming Large Files

```typescript
// app/controllers/reports_controller.ts
import type { HttpContext } from '@adonisjs/core/http'
import { createReadStream } from 'node:fs'

export default class ReportsController {
  // ✅ Stream files instead of loading into memory
  async downloadReport({ response, params }: HttpContext) {
    const filename = `report-${params.id}.csv`
    const filepath = `./storage/reports/${filename}`

    response.header('Content-Type', 'text/csv')
    response.header('Content-Disposition', `attachment; filename="${filename}"`)
    
    const stream = createReadStream(filepath)
    return response.stream(stream)
  }

  // ✅ Process data in chunks
  async generateReport({ response }: HttpContext) {
    response.header('Content-Type', 'application/json')
    
    const users = await User.query().limit(1000)
    return response.json({ data: users })
  }
}
```

### API Performance

#### Response Optimization

```typescript
// app/controllers/api/posts_controller.ts
export default class PostsController {
  // ✅ Implement field selection
  async index({ request, response }: HttpContext) {
    const fields = request.input('fields', '').split(',').filter(Boolean)
    const query = Post.query()

    if (fields.length > 0) {
      // Only select requested fields
      query.select(fields)
    }

    // ✅ Implement cursor-based pagination for better performance
    const cursor = request.input('cursor')
    const limit = Math.min(request.input('limit', 20), 100)

    if (cursor) {
      query.where('id', '>', cursor)
    }

    const posts = await query
      .preload('author', (authorQuery) => {
        authorQuery.select(['id', 'name', 'avatar'])
      })
      .orderBy('id', 'asc')
      .limit(limit)

    const nextCursor = posts.length === limit ? posts[posts.length - 1].id : null

    return response.json({
      data: posts,
      pagination: {
        nextCursor,
        hasMore: posts.length === limit
      }
    })
  }

  // ✅ Implement ETags for caching
  async show({ params, response }: HttpContext) {
    const post = await Post.query()
      .where('id', params.id)
      .preload('author')
      .firstOrFail()

    // Generate ETag based on updated timestamp
    const etag = `"${post.updatedAt.toMillis()}"`
    response.header('ETag', etag)
    response.header('Cache-Control', 'max-age=300') // 5 minutes

    return response.json({ data: post })
  }
}
```

#### Request Compression

```typescript
// app/middleware/compression_middleware.ts
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { gzip, deflate } from 'node:zlib'
import { promisify } from 'node:util'

export default class CompressionMiddleware {
  private gzipAsync = promisify(gzip)
  private deflateAsync = promisify(deflate)

  async handle(ctx: HttpContext, next: NextFn) {
    await next()

    const { request, response } = ctx
    const acceptEncoding = request.header('accept-encoding', '')
    const body = response.getBody()

    // Only compress if body is substantial
    if (!body || typeof body !== 'string' || body.length < 1024) {
      return
    }

    try {
      if (acceptEncoding.includes('gzip')) {
        const compressed = await this.gzipAsync(body)
        response.header('Content-Encoding', 'gzip')
        response.header('Content-Length', compressed.length.toString())
        response.send(compressed)
      } else if (acceptEncoding.includes('deflate')) {
        const compressed = await this.deflateAsync(body)
        response.header('Content-Encoding', 'deflate')
        response.header('Content-Length', compressed.length.toString())
        response.send(compressed)
      }
    } catch (error) {
      // Fall back to uncompressed response
      console.error('Compression failed:', error)
    }
  }
}
```

### Background Jobs

```typescript
// app/services/queue_service.ts
import redis from '@adonisjs/redis/services/main'

export default class QueueService {
  // ✅ Add job to queue
  async addJob(queueName: string, jobData: any) {
    const job = {
      id: Date.now().toString(),
      data: jobData,
      createdAt: new Date().toISOString()
    }

    await redis.lpush(`queue:${queueName}`, JSON.stringify(job))
  }

  // ✅ Process jobs
  async processJobs(queueName: string, processor: (data: any) => Promise<void>) {
    while (true) {
      try {
        const jobData = await redis.brpop(`queue:${queueName}`, 10)
        if (!jobData) continue

        const job = JSON.parse(jobData[1])
        await processor(job.data)
        console.log(`Job ${job.id} completed`)
      } catch (error) {
        console.error('Job processing error:', error)
      }
    }
  }
}
```

### Performance Monitoring

```typescript
// app/middleware/performance_middleware.ts
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import logger from '@adonisjs/core/services/logger'

export default class PerformanceMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const startTime = Date.now()

    try {
      const result = await next()
      
      const duration = Date.now() - startTime

      // Log slow requests
      if (duration > 1000) {
        logger.warn('Slow request', {
          method: ctx.request.method(),
          url: ctx.request.url(),
          duration: `${duration}ms`
        })
      }

      // Add response time header
      ctx.response.header('X-Response-Time', `${duration}ms`)
      
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      logger.error('Request failed', {
        method: ctx.request.method(),
        url: ctx.request.url(),
        duration: `${duration}ms`,
        error: error.message
      })

      throw error
    }
  }
}
```

### Performance Best Practices

#### DO's

```typescript
// ✅ Use database transactions for related operations
async createUserWithProfile(userData: any, profileData: any) {
  const trx = await Database.transaction()
  
  try {
    const user = await User.create(userData, { client: trx })
    const profile = await Profile.create({
      ...profileData,
      userId: user.id
    }, { client: trx })
    
    await trx.commit()
    return { user, profile }
  } catch (error) {
    await trx.rollback()
    throw error
  }
}

// ✅ Use bulk operations for multiple records
async updateMultipleUsers(userIds: number[], data: any) {
  return await User.query()
    .whereIn('id', userIds)
    .update(data)
}

// ✅ Implement proper pagination
async getPaginatedPosts(page: number, limit: number) {
  return await Post.query()
    .preload('author', query => query.select(['id', 'name']))
    .paginate(page, Math.min(limit, 100)) // Cap at 100
}
```

#### DON'Ts

```typescript
// ❌ N+1 query problem
async getBadPosts() {
  const posts = await Post.all()
  
  for (const post of posts) {
    post.author = await User.find(post.userId) // N+1 queries!
  }
  
  return posts
}

// ❌ Loading too much data
async getAllUsers() {
  return await User.all() // Could be millions of records!
}

// ❌ Not using indexes
await User.query().where('email', 'like', '%@gmail.com') // Can't use index

// ❌ Synchronous operations in async context
async processFile() {
  const data = fs.readFileSync('large-file.txt') // Blocks the event loop
  return data
}
```

### Sources

- [AdonisJS Performance Guide](https://docs.adonisjs.com/guides/performance)
- [Node.js Performance Best Practices](https://nodejs.org/en/docs/guides/simple-profiling/)
- [Database Performance](https://lucid.adonisjs.com/docs/query-performance)
- [Redis Caching](https://docs.adonisjs.com/guides/redis)