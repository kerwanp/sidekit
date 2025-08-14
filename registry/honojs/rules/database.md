---
parent: honojs
name: Database Integration
description: Database connection and ORM patterns
type: rule
---

## Database Integration

### Rules

- Database connections MUST be properly pooled and managed
- SQL injection MUST be prevented using parameterized queries
- Database operations MUST be wrapped in try-catch blocks
- Transactions MUST be used for multi-step operations
- Database schemas MUST be versioned with migrations
- Connection timeouts MUST be configured appropriately
- Database credentials MUST be stored in environment variables
- Query performance MUST be monitored in production
- Database connection health checks MUST be implemented

### PostgreSQL with node-postgres

```typescript
// src/lib/db.ts
import { Pool, PoolClient } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  statement_timeout: 30000,
  query_timeout: 30000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

// Health check
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const client = await pool.connect()
    await client.query('SELECT 1')
    client.release()
    return true
  } catch (error) {
    console.error('Database health check failed:', error)
    return false
  }
}

// Generic query function
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  try {
    const result = await pool.query(text, params)
    return result.rows
  } catch (error) {
    console.error('Database query error:', error)
    throw new Error('Database operation failed')
  }
}

// Transaction wrapper
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

// User repository
export const userRepository = {
  async findAll(): Promise<User[]> {
    return query<User>('SELECT * FROM users ORDER BY created_at DESC')
  },

  async findById(id: string): Promise<User | null> {
    const users = await query<User>('SELECT * FROM users WHERE id = $1', [id])
    return users[0] || null
  },

  async findByEmail(email: string): Promise<User | null> {
    const users = await query<User>(
      'SELECT * FROM users WHERE email = $1',
      [email]
    )
    return users[0] || null
  },

  async create(userData: CreateUserData): Promise<User> {
    const users = await query<User>(
      `INSERT INTO users (id, email, name, password_hash) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [crypto.randomUUID(), userData.email, userData.name, userData.passwordHash]
    )
    return users[0]
  },

  async update(id: string, updates: Partial<UpdateUserData>): Promise<User | null> {
    const fields = Object.keys(updates)
    const values = Object.values(updates)
    
    if (fields.length === 0) {
      return this.findById(id)
    }
    
    const setClause = fields
      .map((field, index) => `${field} = $${index + 2}`)
      .join(', ')
    
    const users = await query<User>(
      `UPDATE users SET ${setClause}, updated_at = NOW() 
       WHERE id = $1 
       RETURNING *`,
      [id, ...values]
    )
    
    return users[0] || null
  },

  async delete(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM users WHERE id = $1', [id])
    return result.rowCount > 0
  }
}
```

### Drizzle ORM Integration

```typescript
// src/lib/drizzle.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import * as schema from './schema'

// Database connection
const connectionString = process.env.DATABASE_URL!
const sql = postgres(connectionString, { max: 1 })
export const db = drizzle(sql, { schema })

// Run migrations
export async function runMigrations() {
  await migrate(db, { migrationsFolder: './drizzle' })
  await sql.end()
}

// src/lib/schema.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  index,
  unique
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  passwordHash: text('password_hash').notNull(),
  emailVerified: boolean('email_verified').default(false),
  role: varchar('role', { length: 50 }).default('user'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  emailIdx: unique().on(table.email),
  nameIdx: index().on(table.name),
}))

export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  published: boolean('published').default(false),
  authorId: uuid('author_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  authorIdx: index().on(table.authorId),
  publishedIdx: index().on(table.published),
}))

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}))

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}))

// Types
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Post = typeof posts.$inferSelect
export type NewPost = typeof posts.$inferInsert

// Repository using Drizzle
import { eq, desc, and, ilike } from 'drizzle-orm'

export const drizzleUserRepository = {
  async findAll() {
    return db.select().from(users).orderBy(desc(users.createdAt))
  },

  async findById(id: string) {
    const result = await db.select().from(users).where(eq(users.id, id))
    return result[0] || null
  },

  async findByEmail(email: string) {
    const result = await db.select().from(users).where(eq(users.email, email))
    return result[0] || null
  },

  async create(userData: NewUser) {
    const result = await db.insert(users).values(userData).returning()
    return result[0]
  },

  async update(id: string, updates: Partial<NewUser>) {
    const result = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning()
    return result[0] || null
  },

  async delete(id: string) {
    const result = await db.delete(users).where(eq(users.id, id))
    return result.rowCount > 0
  },

  async findUsersWithPosts() {
    return db.select().from(users).with(
      db.select().from(posts).where(eq(posts.authorId, users.id))
    )
  }
}
```

### Prisma Integration

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})

// Repository pattern with Prisma
export const prismaUserRepository = {
  async findAll() {
    return prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: { posts: true }
    })
  },

  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: { posts: true }
    })
  },

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email }
    })
  },

  async create(data: { email: string; name: string; passwordHash: string }) {
    return prisma.user.create({
      data,
      include: { posts: true }
    })
  },

  async update(id: string, data: { name?: string; email?: string }) {
    return prisma.user.update({
      where: { id },
      data,
      include: { posts: true }
    })
  },

  async delete(id: string) {
    await prisma.user.delete({
      where: { id }
    })
    return true
  },

  async createWithPosts(userData: any, postsData: any[]) {
    return prisma.user.create({
      data: {
        ...userData,
        posts: {
          create: postsData
        }
      },
      include: { posts: true }
    })
  }
}

// schema.prisma
/*
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  name         String
  passwordHash String   @map("password_hash")
  emailVerified Boolean @default(false) @map("email_verified")
  role         String   @default("user")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")
  
  posts Post[]
  
  @@map("users")
}

model Post {
  id        String   @id @default(cuid())
  title     String
  content   String
  published Boolean  @default(false)
  authorId  String   @map("author_id")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  author User @relation(fields: [authorId], references: [id])
  
  @@map("posts")
}
*/
```

### SQLite with Better-SQLite3

```typescript
// src/lib/sqlite.ts
import Database from 'better-sqlite3'
import { join } from 'path'

const dbPath = process.env.DATABASE_PATH || join(process.cwd(), 'database.sqlite')
export const db = new Database(dbPath)

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL')
db.pragma('synchronous = NORMAL')
db.pragma('cache_size = 1000000')
db.pragma('temp_store = memory')

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
`)

// Prepared statements for better performance
const statements = {
  findAllUsers: db.prepare('SELECT * FROM users ORDER BY created_at DESC'),
  findUserById: db.prepare('SELECT * FROM users WHERE id = ?'),
  findUserByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
  createUser: db.prepare(`
    INSERT INTO users (id, email, name, password_hash)
    VALUES (?, ?, ?, ?)
  `),
  updateUser: db.prepare(`
    UPDATE users 
    SET email = ?, name = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),
  deleteUser: db.prepare('DELETE FROM users WHERE id = ?'),
}

export const sqliteUserRepository = {
  findAll() {
    return statements.findAllUsers.all()
  },

  findById(id: string) {
    return statements.findUserById.get(id) || null
  },

  findByEmail(email: string) {
    return statements.findUserByEmail.get(email) || null
  },

  create(userData: { email: string; name: string; passwordHash: string }) {
    const id = crypto.randomUUID()
    statements.createUser.run(id, userData.email, userData.name, userData.passwordHash)
    return this.findById(id)
  },

  update(id: string, updates: { email?: string; name?: string }) {
    const user = this.findById(id)
    if (!user) return null
    
    statements.updateUser.run(
      updates.email || user.email,
      updates.name || user.name,
      id
    )
    return this.findById(id)
  },

  delete(id: string) {
    const result = statements.deleteUser.run(id)
    return result.changes > 0
  }
}

// Graceful shutdown
process.on('exit', () => db.close())
process.on('SIGHUP', () => process.exit(128 + 1))
process.on('SIGINT', () => process.exit(128 + 2))
process.on('SIGTERM', () => process.exit(128 + 15))
```

### Database Middleware

```typescript
// src/middleware/database.ts
import { Context, Next } from 'hono'
import { db } from '../lib/db'

// Add database to context
export const databaseMiddleware = async (c: Context, next: Next) => {
  c.set('db', db)
  await next()
}

// Transaction middleware
export const transactionMiddleware = async (c: Context, next: Next) => {
  const transaction = await db.transaction()
  c.set('transaction', transaction)
  
  try {
    await next()
    await transaction.commit()
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}

// Usage in routes
app.use('*', databaseMiddleware)

app.post('/users', transactionMiddleware, async (c) => {
  const transaction = c.get('transaction')
  const userData = await c.req.json()
  
  // Create user within transaction
  const user = await transaction.user.create({ data: userData })
  
  return c.json({ user }, 201)
})
```

### Connection Pooling for Cloudflare D1

```typescript
// src/lib/d1.ts
export const d1UserRepository = {
  async findAll(env: { DB: D1Database }) {
    const { results } = await env.DB.prepare(
      'SELECT * FROM users ORDER BY created_at DESC'
    ).all()
    return results
  },

  async findById(env: { DB: D1Database }, id: string) {
    const result = await env.DB.prepare(
      'SELECT * FROM users WHERE id = ?'
    ).bind(id).first()
    return result || null
  },

  async create(env: { DB: D1Database }, userData: any) {
    const id = crypto.randomUUID()
    
    await env.DB.prepare(`
      INSERT INTO users (id, email, name, password_hash)
      VALUES (?, ?, ?, ?)
    `).bind(id, userData.email, userData.name, userData.passwordHash).run()
    
    return this.findById(env, id)
  },

  async update(env: { DB: D1Database }, id: string, updates: any) {
    await env.DB.prepare(`
      UPDATE users 
      SET email = ?, name = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(updates.email, updates.name, id).run()
    
    return this.findById(env, id)
  },

  async delete(env: { DB: D1Database }, id: string) {
    const result = await env.DB.prepare(
      'DELETE FROM users WHERE id = ?'
    ).bind(id).run()
    
    return result.changes > 0
  }
}

// Usage in Cloudflare Workers
app.get('/users', async (c) => {
  const users = await d1UserRepository.findAll(c.env)
  return c.json({ users })
})
```

### Database Testing

```typescript
// tests/database.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { userRepository } from '../src/lib/db'

describe('User Repository', () => {
  beforeEach(async () => {
    // Setup test database
    await setupTestDatabase()
  })

  afterEach(async () => {
    // Cleanup test database
    await cleanupTestDatabase()
  })

  it('should create a user', async () => {
    const userData = {
      email: 'test@example.com',
      name: 'Test User',
      passwordHash: 'hashed-password'
    }

    const user = await userRepository.create(userData)

    expect(user).toBeDefined()
    expect(user.email).toBe(userData.email)
    expect(user.name).toBe(userData.name)
    expect(user.id).toBeDefined()
  })

  it('should find user by email', async () => {
    const userData = {
      email: 'test@example.com',
      name: 'Test User',
      passwordHash: 'hashed-password'
    }

    await userRepository.create(userData)
    const user = await userRepository.findByEmail(userData.email)

    expect(user).toBeDefined()
    expect(user.email).toBe(userData.email)
  })

  it('should update user', async () => {
    const userData = {
      email: 'test@example.com',
      name: 'Test User',
      passwordHash: 'hashed-password'
    }

    const user = await userRepository.create(userData)
    const updated = await userRepository.update(user.id, { name: 'Updated Name' })

    expect(updated.name).toBe('Updated Name')
    expect(updated.email).toBe(userData.email)
  })
})
```

### Sources

- [Drizzle ORM](https://orm.drizzle.team)
- [Prisma](https://www.prisma.io)
- [node-postgres](https://node-postgres.com)
- [Cloudflare D1](https://developers.cloudflare.com/d1/)