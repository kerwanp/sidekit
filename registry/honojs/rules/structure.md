---
parent: honojs
name: Project Structure
description: Guidelines for organizing Hono.js applications
type: rule
---

## Project Structure

### Recommended Structure

```
root/
├── src/
│   ├── index.ts          # Main application entry point
│   ├── app.ts            # Hono app instance and configuration
│   ├── routes/           # Route modules
│   │   ├── users.ts      # User routes
│   │   ├── posts.ts      # Post routes
│   │   └── auth.ts       # Authentication routes
│   ├── middleware/       # Custom middleware
│   │   ├── auth.ts       # Authentication middleware
│   │   ├── logger.ts     # Logging middleware
│   │   └── cors.ts       # CORS configuration
│   ├── validators/       # Validation schemas
│   │   ├── user.ts       # User validation schemas
│   │   └── post.ts       # Post validation schemas
│   ├── lib/              # Shared utilities and helpers
│   │   ├── db.ts         # Database connection
│   │   └── utils.ts      # Utility functions
│   └── types/            # TypeScript type definitions
│       └── index.ts      # Shared types
├── tests/                # Test files
│   ├── unit/             # Unit tests
│   └── integration/      # Integration tests
├── dist/                 # Compiled output (generated)
├── .env                  # Environment variables
├── .env.example          # Environment variables example
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── wrangler.toml         # Cloudflare Workers config (if applicable)
```

### Rules

- The main application instance MUST be created in `src/app.ts` and exported
- Routes MUST be organized in separate files within `src/routes/`
- Custom middleware MUST be placed in `src/middleware/`
- Validation schemas MUST be placed in `src/validators/`
- Shared utilities and helpers MUST be placed in `src/lib/`
- TypeScript type definitions MUST be placed in `src/types/`
- Environment-specific configuration MUST use `.env` files
- NEVER commit `.env` files to version control
- ALWAYS provide `.env.example` with dummy values

### Examples

#### Main Entry Point (src/index.ts)

```typescript
import { serve } from '@hono/node-server'
import app from './app'

const port = process.env.PORT || 3000

serve({
  fetch: app.fetch,
  port: Number(port)
})

console.log(`Server running on port ${port}`)
```

#### App Configuration (src/app.ts)

```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import users from './routes/users'
import posts from './routes/posts'

const app = new Hono()

// Global middleware
app.use('*', logger())
app.use('*', cors())

// Route mounting
app.route('/api/users', users)
app.route('/api/posts', posts)

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }))

export default app
```

### Sources

- [Hono.js Documentation](https://hono.dev/docs)
- [Best Practices Guide](https://hono.dev/docs/guides/best-practices)