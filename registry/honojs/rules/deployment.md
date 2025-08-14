---
parent: honojs
name: Deployment
description: Multi-runtime deployment strategies
type: rule
---

## Deployment

### Rules

- Environment-specific configurations MUST be managed through environment variables
- Build artifacts MUST be optimized for the target runtime
- Health check endpoints MUST be implemented
- Graceful shutdown MUST be handled properly
- Logging and monitoring MUST be configured for production
- Secrets MUST NEVER be committed to version control
- Different runtimes require different entry points
- Performance optimizations MUST be runtime-specific
- Cold start times SHOULD be minimized for serverless deployments

### Node.js Deployment

```typescript
// src/node.ts
import { serve } from '@hono/node-server'
import { compress } from 'hono/compress'
import app from './app'

const port = parseInt(process.env.PORT || '3000', 10)

// Add Node.js specific middleware
app.use('*', compress())

const server = serve({
  fetch: app.fetch,
  port
})

console.log(`Server running on http://localhost:${port}`)

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

// package.json scripts
{
  "scripts": {
    "start": "node dist/node.js",
    "build": "tsc",
    "dev": "tsx watch src/node.ts"
  }
}

// Dockerfile for Node.js
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY dist ./dist
EXPOSE 3000
USER node
CMD ["node", "dist/node.js"]
```

### Cloudflare Workers

```typescript
// src/cloudflare.ts
import app from './app'

export default {
  fetch: app.fetch,
  
  // Scheduled handler (Cron Triggers)
  scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(handleScheduledEvent(event, env))
  },
  
  // Queue handler
  queue(batch: MessageBatch, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(processQueue(batch, env))
  }
}

// wrangler.toml
name = "my-hono-app"
main = "src/cloudflare.ts"
compatibility_date = "2024-01-01"
node_compat = true

[env.production]
vars = { ENVIRONMENT = "production" }
kv_namespaces = [
  { binding = "KV", id = "your-kv-id" }
]
durable_objects.bindings = [
  { name = "COUNTER", class_name = "Counter" }
]
r2_buckets = [
  { binding = "BUCKET", bucket_name = "my-bucket" }
]

[[env.production.routes]]
pattern = "api.example.com/*"
zone_id = "your-zone-id"

[env.production.limits]
cpu_ms = 50

// package.json scripts
{
  "scripts": {
    "deploy": "wrangler deploy",
    "dev": "wrangler dev",
    "tail": "wrangler tail"
  }
}
```

### Vercel

```typescript
// api/index.ts (Vercel Functions)
import { handle } from 'hono/vercel'
import app from '../src/app'

export const config = {
  runtime: 'edge', // or 'nodejs'
  regions: ['iad1'], // Specify regions
  maxDuration: 10 // Maximum execution time in seconds
}

export default handle(app)

// vercel.json
{
  "functions": {
    "api/index.ts": {
      "runtime": "edge",
      "maxDuration": 10,
      "memory": 1024,
      "regions": ["iad1", "sfo1"]
    }
  },
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/api"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  },
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}

// package.json scripts
{
  "scripts": {
    "build": "tsc",
    "vercel": "vercel",
    "vercel:prod": "vercel --prod"
  }
}
```

### AWS Lambda

```typescript
// src/lambda.ts
import { handle } from 'hono/aws-lambda'
import app from './app'

export const handler = handle(app)

// serverless.yml (Serverless Framework)
service: hono-lambda-app
frameworkVersion: '3'

provider:
  name: aws
  runtime: nodejs20.x
  region: us-east-1
  memorySize: 512
  timeout: 10
  environment:
    NODE_ENV: production
    DATABASE_URL: ${env:DATABASE_URL}
  iam:
    role:
      statements:
        - Effect: Allow
          Action:
            - dynamodb:*
          Resource: "*"

functions:
  api:
    handler: dist/lambda.handler
    events:
      - httpApi:
          path: /{proxy+}
          method: ANY
      - httpApi:
          path: /
          method: ANY
    reservedConcurrency: 10
    provisionedConcurrency: 2

plugins:
  - serverless-plugin-typescript
  - serverless-offline

// CDK deployment (alternative)
import * as cdk from 'aws-cdk-lib'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2'

export class HonoLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)
    
    const fn = new lambda.Function(this, 'HonoFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('dist'),
      handler: 'lambda.handler',
      memorySize: 512,
      timeout: cdk.Duration.seconds(10),
      environment: {
        NODE_ENV: 'production'
      }
    })
    
    const api = new apigateway.HttpApi(this, 'HonoApi', {
      defaultIntegration: new apigateway.HttpLambdaIntegration(
        'HonoIntegration',
        fn
      )
    })
  }
}
```

### Deno Deploy

```typescript
// src/deno.ts
import { Hono } from 'https://deno.land/x/hono/mod.ts'
import app from './app.ts'

Deno.serve(app.fetch)

// deno.json
{
  "tasks": {
    "dev": "deno run --allow-net --allow-env --watch src/deno.ts",
    "start": "deno run --allow-net --allow-env src/deno.ts",
    "deploy": "deployctl deploy --project=my-project src/deno.ts"
  },
  "imports": {
    "hono": "https://deno.land/x/hono/mod.ts",
    "@/": "./src/"
  },
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "hono/jsx"
  }
}

// GitHub Actions deployment
name: Deploy to Deno Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: denoland/deployctl@v1
        with:
          project: my-project
          entrypoint: src/deno.ts
          root: .
```

### Bun Deployment

```typescript
// src/bun.ts
import app from './app'

const server = Bun.serve({
  port: process.env.PORT || 3000,
  fetch: app.fetch,
  
  // Bun-specific optimizations
  maxRequestBodySize: 10 * 1024 * 1024, // 10MB
  
  // WebSocket support
  websocket: {
    open(ws) {
      console.log('WebSocket opened')
    },
    message(ws, message) {
      ws.send(message)
    },
    close(ws) {
      console.log('WebSocket closed')
    }
  }
})

console.log(`Server running on ${server.url}`)

// package.json scripts
{
  "scripts": {
    "start": "bun run src/bun.ts",
    "dev": "bun --watch src/bun.ts",
    "build": "bun build src/bun.ts --outdir dist --target bun"
  }
}

// Dockerfile for Bun
FROM oven/bun:latest AS builder
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

FROM oven/bun:latest
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY src ./src
EXPOSE 3000
USER bun
CMD ["bun", "run", "src/bun.ts"]
```

### Docker Deployment

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@db:5432/mydb
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
  
  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=mydb
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:

# Multi-stage Dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 hono
COPY --from=builder --chown=hono:nodejs /app/dist ./dist
COPY --from=deps --chown=hono:nodejs /app/node_modules ./node_modules
USER hono
EXPOSE 3000
CMD ["node", "dist/node.js"]
```

### Health Checks & Monitoring

```typescript
// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.APP_VERSION || 'unknown'
  })
})

// Readiness check
app.get('/ready', async (c) => {
  try {
    // Check database connection
    await checkDatabaseConnection()
    // Check external services
    await checkExternalServices()
    
    return c.json({ ready: true })
  } catch (error) {
    return c.json({ ready: false, error: error.message }, 503)
  }
})

// Metrics endpoint
app.get('/metrics', (c) => {
  const metrics = collectMetrics()
  c.header('Content-Type', 'text/plain')
  return c.text(metrics)
})
```

### Environment Configuration

```typescript
// src/config/index.ts
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().optional(),
  JWT_SECRET: z.string().min(32),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  CORS_ORIGIN: z.string().default('*'),
  RATE_LIMIT_MAX: z.string().default('100'),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000')
})

export const config = envSchema.parse(process.env)

// Runtime-specific configuration
export const getRuntimeConfig = () => {
  const runtime = detectRuntime()
  
  switch (runtime) {
    case 'cloudflare':
      return {
        maxBodySize: 10 * 1024 * 1024, // 10MB
        maxDuration: 30
      }
    case 'vercel':
      return {
        maxBodySize: 4.5 * 1024 * 1024, // 4.5MB
        maxDuration: 10
      }
    case 'aws-lambda':
      return {
        maxBodySize: 6 * 1024 * 1024, // 6MB
        maxDuration: 900
      }
    default:
      return {
        maxBodySize: 50 * 1024 * 1024, // 50MB
        maxDuration: Infinity
      }
  }
}
```

### Sources

- [Deployment Guide](https://hono.dev/docs/getting-started/vercel)
- [Cloudflare Workers](https://hono.dev/docs/getting-started/cloudflare-workers)
- [AWS Lambda](https://hono.dev/docs/getting-started/aws-lambda)
- [Deno Deploy](https://hono.dev/docs/getting-started/deno)