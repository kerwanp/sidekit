---
parent: honojs
name: Testing
description: Testing strategies and best practices
type: rule
---

## Testing

### Rules

- Unit tests MUST be written for all business logic
- Integration tests MUST be written for API endpoints
- Test files MUST be colocated with source files or in a `tests/` directory
- Test coverage SHOULD be maintained above 80%
- Mocking SHOULD be used for external dependencies
- Test data MUST NOT contain real user information
- Tests MUST be isolated and not depend on execution order
- E2E tests SHOULD cover critical user flows
- Performance tests SHOULD be included for critical endpoints

### Test Setup

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '*.config.ts'
      ]
    },
    setupFiles: ['./tests/setup.ts']
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})

// tests/setup.ts
import { beforeAll, afterAll, beforeEach } from 'vitest'

beforeAll(() => {
  // Global setup
  process.env.NODE_ENV = 'test'
  process.env.JWT_SECRET = 'test-secret'
})

beforeEach(() => {
  // Reset mocks before each test
  vi.clearAllMocks()
})

afterAll(() => {
  // Cleanup
})
```

### Unit Testing

```typescript
// src/lib/utils.test.ts
import { describe, it, expect } from 'vitest'
import { formatDate, calculatePrice, validateEmail } from './utils'

describe('Utils', () => {
  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      expect(formatDate(date)).toBe('2024-01-15')
    })
    
    it('should handle invalid dates', () => {
      expect(formatDate(null)).toBe('')
      expect(formatDate(undefined)).toBe('')
    })
  })
  
  describe('calculatePrice', () => {
    it('should calculate price with tax', () => {
      expect(calculatePrice(100, 0.1)).toBe(110)
    })
    
    it('should handle negative values', () => {
      expect(() => calculatePrice(-100, 0.1)).toThrow('Invalid price')
    })
  })
  
  describe('validateEmail', () => {
    it.each([
      ['user@example.com', true],
      ['user+tag@example.co.uk', true],
      ['invalid.email', false],
      ['@example.com', false],
      ['user@', false]
    ])('validates %s as %s', (email, expected) => {
      expect(validateEmail(email)).toBe(expected)
    })
  })
})
```

### API Testing

```typescript
// src/routes/users.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Hono } from 'hono'
import { testClient } from 'hono/testing'
import users from './users'
import * as db from '@/lib/db'

// Mock database
vi.mock('@/lib/db')

describe('Users API', () => {
  let app: Hono
  
  beforeEach(() => {
    app = new Hono()
    app.route('/users', users)
  })
  
  describe('GET /users', () => {
    it('should return all users', async () => {
      const mockUsers = [
        { id: '1', name: 'Alice', email: 'alice@example.com' },
        { id: '2', name: 'Bob', email: 'bob@example.com' }
      ]
      
      vi.mocked(db.getUsers).mockResolvedValue(mockUsers)
      
      const res = await app.request('/users')
      
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toEqual(mockUsers)
      expect(db.getUsers).toHaveBeenCalledOnce()
    })
    
    it('should handle pagination', async () => {
      const res = await app.request('/users?page=2&limit=10')
      
      expect(res.status).toBe(200)
      expect(db.getUsers).toHaveBeenCalledWith({ 
        offset: 10, 
        limit: 10 
      })
    })
  })
  
  describe('POST /users', () => {
    it('should create a new user', async () => {
      const newUser = { 
        name: 'Charlie', 
        email: 'charlie@example.com' 
      }
      
      const createdUser = { id: '3', ...newUser }
      vi.mocked(db.createUser).mockResolvedValue(createdUser)
      
      const res = await app.request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      })
      
      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data).toEqual(createdUser)
    })
    
    it('should validate input', async () => {
      const invalidUser = { name: '', email: 'invalid' }
      
      const res = await app.request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidUser)
      })
      
      expect(res.status).toBe(400)
      const error = await res.json()
      expect(error).toHaveProperty('error')
    })
  })
  
  describe('PUT /users/:id', () => {
    it('should update an existing user', async () => {
      const update = { name: 'Alice Updated' }
      const updated = { id: '1', name: 'Alice Updated', email: 'alice@example.com' }
      
      vi.mocked(db.updateUser).mockResolvedValue(updated)
      
      const res = await app.request('/users/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update)
      })
      
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toEqual(updated)
    })
    
    it('should return 404 for non-existent user', async () => {
      vi.mocked(db.updateUser).mockResolvedValue(null)
      
      const res = await app.request('/users/999', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test' })
      })
      
      expect(res.status).toBe(404)
    })
  })
  
  describe('DELETE /users/:id', () => {
    it('should delete a user', async () => {
      vi.mocked(db.deleteUser).mockResolvedValue(true)
      
      const res = await app.request('/users/1', {
        method: 'DELETE'
      })
      
      expect(res.status).toBe(204)
      expect(db.deleteUser).toHaveBeenCalledWith('1')
    })
  })
})
```

### Authentication Testing

```typescript
// src/middleware/auth.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { authMiddleware } from './auth'

describe('Auth Middleware', () => {
  let app: Hono
  
  beforeEach(() => {
    app = new Hono()
    app.use('*', authMiddleware)
    app.get('/protected', (c) => c.json({ success: true }))
  })
  
  it('should allow access with valid token', async () => {
    const token = await sign(
      { sub: 'user123', role: 'user' },
      'test-secret'
    )
    
    const res = await app.request('/protected', {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toEqual({ success: true })
  })
  
  it('should deny access without token', async () => {
    const res = await app.request('/protected')
    
    expect(res.status).toBe(401)
    const error = await res.json()
    expect(error).toHaveProperty('error')
  })
  
  it('should deny access with invalid token', async () => {
    const res = await app.request('/protected', {
      headers: { Authorization: 'Bearer invalid-token' }
    })
    
    expect(res.status).toBe(401)
  })
  
  it('should deny access with expired token', async () => {
    const token = await sign(
      { sub: 'user123', exp: Math.floor(Date.now() / 1000) - 3600 },
      'test-secret'
    )
    
    const res = await app.request('/protected', {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    expect(res.status).toBe(401)
  })
})
```

### Integration Testing

```typescript
// tests/integration/workflow.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Hono } from 'hono'
import app from '@/app'
import { setupTestDatabase, teardownTestDatabase } from '../helpers'

describe('User Workflow Integration', () => {
  let testUserId: string
  let authToken: string
  
  beforeAll(async () => {
    await setupTestDatabase()
  })
  
  afterAll(async () => {
    await teardownTestDatabase()
  })
  
  it('should complete full user workflow', async () => {
    // 1. Register user
    const registerRes = await app.request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'Test123!',
        name: 'Test User'
      })
    })
    
    expect(registerRes.status).toBe(201)
    const { user, token } = await registerRes.json()
    testUserId = user.id
    authToken = token
    
    // 2. Login
    const loginRes = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'Test123!'
      })
    })
    
    expect(loginRes.status).toBe(200)
    
    // 3. Get profile
    const profileRes = await app.request('/users/me', {
      headers: { Authorization: `Bearer ${authToken}` }
    })
    
    expect(profileRes.status).toBe(200)
    const profile = await profileRes.json()
    expect(profile.email).toBe('test@example.com')
    
    // 4. Update profile
    const updateRes = await app.request('/users/me', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({ name: 'Updated Name' })
    })
    
    expect(updateRes.status).toBe(200)
    
    // 5. Delete account
    const deleteRes = await app.request('/users/me', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` }
    })
    
    expect(deleteRes.status).toBe(204)
    
    // 6. Verify deletion
    const verifyRes = await app.request('/users/me', {
      headers: { Authorization: `Bearer ${authToken}` }
    })
    
    expect(verifyRes.status).toBe(401)
  })
})
```

### Performance Testing

```typescript
// tests/performance/load.test.ts
import { describe, it, expect } from 'vitest'
import app from '@/app'

describe('Performance Tests', () => {
  it('should handle concurrent requests', async () => {
    const requests = Array.from({ length: 100 }, () =>
      app.request('/health')
    )
    
    const start = performance.now()
    const responses = await Promise.all(requests)
    const duration = performance.now() - start
    
    expect(responses.every(r => r.status === 200)).toBe(true)
    expect(duration).toBeLessThan(1000) // Should complete within 1 second
  })
  
  it('should maintain response time under load', async () => {
    const times: number[] = []
    
    for (let i = 0; i < 50; i++) {
      const start = performance.now()
      await app.request('/api/data')
      times.push(performance.now() - start)
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length
    const maxTime = Math.max(...times)
    
    expect(avgTime).toBeLessThan(100) // Average under 100ms
    expect(maxTime).toBeLessThan(500) // Max under 500ms
  })
})
```

### Test Utilities

```typescript
// tests/helpers/index.ts
import { Hono } from 'hono'
import { sign } from 'hono/jwt'

export const createTestApp = () => {
  const app = new Hono()
  // Add common test middleware
  return app
}

export const createAuthToken = async (payload: any) => {
  return sign(
    { ...payload, exp: Math.floor(Date.now() / 1000) + 3600 },
    process.env.JWT_SECRET || 'test-secret'
  )
}

export const createMockUser = (overrides = {}) => ({
  id: 'test-id',
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
  createdAt: new Date(),
  ...overrides
})

export const waitFor = (ms: number) => 
  new Promise(resolve => setTimeout(resolve, ms))

export class TestDatabase {
  private data = new Map()
  
  async get(key: string) {
    return this.data.get(key)
  }
  
  async set(key: string, value: any) {
    this.data.set(key, value)
  }
  
  async clear() {
    this.data.clear()
  }
}
```

### Sources

- [Testing with Hono](https://hono.dev/docs/guides/testing)
- [Vitest Documentation](https://vitest.dev)
- [Jest Documentation](https://jestjs.io)