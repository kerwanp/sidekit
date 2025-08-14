---
parent: adonisjs
name: Deployment
description: Deployment guidelines and best practices for AdonisJS 6 applications
type: rule
---

## Deployment Guidelines

### Production Environment Setup

#### Environment Configuration

```env
# Production .env
NODE_ENV=production
PORT=3333
HOST=0.0.0.0

# Application
APP_KEY=your-32-character-secure-app-key
LOG_LEVEL=info

# Database
DB_HOST=your-database-host
DB_PORT=5432
DB_USER=your-db-user
DB_PASSWORD=your-secure-db-password
DB_DATABASE=your-production-db

# Redis
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Security
SESSION_DRIVER=redis
CORS_ENABLED=true

# External Services
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USERNAME=your-smtp-user
SMTP_PASSWORD=your-smtp-password

# Monitoring
SENTRY_DSN=your-sentry-dsn
NEW_RELIC_LICENSE_KEY=your-new-relic-key
```

#### Production Configuration

```typescript
// config/app.ts
import env from '#start/env'

export default {
  appKey: env.get('APP_KEY'),
  http: {
    host: env.get('HOST'),
    port: env.get('PORT'),
    // ✅ Trust proxy in production
    trustProxy: env.get('NODE_ENV') === 'production',
    cookie: {
      // ✅ Secure cookies in production
      secure: env.get('NODE_ENV') === 'production',
      sameSite: 'strict',
      httpOnly: true
    }
  },
  
  // ✅ Disable debug in production
  debug: env.get('NODE_ENV') !== 'production',
  
  // ✅ Production optimizations
  profiler: {
    enabled: env.get('NODE_ENV') === 'development'
  }
}
```

### Docker Deployment

#### Dockerfile

```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build application
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create app user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 adonisjs

# Copy built application
COPY --from=builder --chown=adonisjs:nodejs /app/build ./
COPY --from=builder --chown=adonisjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=adonisjs:nodejs /app/package.json ./package.json

USER adonisjs

EXPOSE 3333

ENV PORT=3333
ENV HOST=0.0.0.0

CMD ["node", "bin/server.js"]
```

#### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3333:3333"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/myapp
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3333/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_data:/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### Nginx Configuration

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3333;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com;
        
        # Redirect HTTP to HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name yourdomain.com www.yourdomain.com;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;

        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # Gzip compression
        gzip on;
        gzip_vary on;
        gzip_min_length 1024;
        gzip_types
            application/atom+xml
            application/javascript
            application/json
            application/ld+json
            application/manifest+json
            application/rss+xml
            application/vnd.geo+json
            application/vnd.ms-fontobject
            application/x-font-ttf
            application/x-web-app-manifest+json
            application/xhtml+xml
            application/xml
            font/opentype
            image/bmp
            image/svg+xml
            image/x-icon
            text/cache-manifest
            text/css
            text/plain
            text/vcard
            text/vnd.rim.location.xloc
            text/vtt
            text/x-component
            text/x-cross-domain-policy;

        # Static files
        location /static/ {
            alias /app/public/;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # API rate limiting
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Login rate limiting
        location /auth/login {
            limit_req zone=login burst=5 nodelay;
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Default proxy
        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # WebSocket support
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }
    }
}
```

### CI/CD Pipeline

#### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linting
        run: npm run lint

      - name: Run type checking
        run: npm run typecheck

      - name: Run tests
        run: npm test
        env:
          NODE_ENV: test
          DB_HOST: localhost
          DB_PORT: 5432
          DB_USER: postgres
          DB_PASSWORD: postgres
          DB_DATABASE: test_db
          REDIS_HOST: localhost
          REDIS_PORT: 6379

      - name: Build application
        run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v3

      - name: Setup Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Login to Container Registry
        uses: docker/login-action@v2
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push Docker image
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: ghcr.io/${{ github.repository }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Deploy to production
        uses: appleboy/ssh-action@v0.1.7
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_KEY }}
          script: |
            cd /app
            docker compose pull
            docker compose up -d
            docker system prune -f
```

### Health Checks

```typescript
// app/controllers/health_controller.ts
import type { HttpContext } from '@adonisjs/core/http'
import Database from '@adonisjs/lucid/services/db'
import redis from '@adonisjs/redis/services/main'

export default class HealthController {
  // ✅ Basic health check
  async index({ response }: HttpContext) {
    return response.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0'
    })
  }

  // ✅ Detailed health check
  async detailed({ response }: HttpContext) {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkMemory(),
      this.checkDisk()
    ])

    const results = {
      database: checks[0].status === 'fulfilled' ? checks[0].value : { status: 'error', error: checks[0].reason?.message },
      redis: checks[1].status === 'fulfilled' ? checks[1].value : { status: 'error', error: checks[1].reason?.message },
      memory: checks[2].status === 'fulfilled' ? checks[2].value : { status: 'error', error: checks[2].reason?.message },
      disk: checks[3].status === 'fulfilled' ? checks[3].value : { status: 'error', error: checks[3].reason?.message }
    }

    const overall = Object.values(results).every(check => check.status === 'ok')

    return response
      .status(overall ? 200 : 503)
      .json({
        status: overall ? 'ok' : 'error',
        checks: results,
        timestamp: new Date().toISOString()
      })
  }

  private async checkDatabase() {
    const start = Date.now()
    await Database.rawQuery('SELECT 1')
    const responseTime = Date.now() - start

    return {
      status: 'ok',
      responseTime,
      message: `Database connected (${responseTime}ms)`
    }
  }

  private async checkRedis() {
    const start = Date.now()
    await redis.ping()
    const responseTime = Date.now() - start

    return {
      status: 'ok',
      responseTime,
      message: `Redis connected (${responseTime}ms)`
    }
  }

  private async checkMemory() {
    const usage = process.memoryUsage()
    const usedMB = Math.round(usage.heapUsed / 1024 / 1024)
    const totalMB = Math.round(usage.heapTotal / 1024 / 1024)

    return {
      status: 'ok',
      memory: {
        used: `${usedMB}MB`,
        total: `${totalMB}MB`,
        percentage: Math.round((usage.heapUsed / usage.heapTotal) * 100)
      }
    }
  }

  private async checkDisk() {
    // Simplified disk check
    return {
      status: 'ok',
      message: 'Disk space available'
    }
  }
}
```

### Database Migrations in Production

```typescript
// database/migrations/production_deployment.ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    // ✅ Safe migrations for production
    this.schema.alterTable(this.tableName, (table) => {
      // Add columns with defaults
      table.boolean('email_verified').defaultTo(false)
      table.timestamp('last_login_at').nullable()
      
      // Create indexes
      table.index(['email'], 'users_email_index')
      table.index(['created_at'], 'users_created_at_index')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['email'], 'users_email_index')
      table.dropIndex(['created_at'], 'users_created_at_index')
      table.dropColumn('email_verified')
      table.dropColumn('last_login_at')
    })
  }
}
```

### Monitoring and Logging

```typescript
// config/logger.ts
import env from '#start/env'

export default {
  default: 'app',

  loggers: {
    app: {
      enabled: true,
      name: env.get('APP_NAME'),
      level: env.get('LOG_LEVEL'),
      redact: {
        paths: ['password', 'password_confirmation', 'token', 'secret'],
        censor: '***'
      },
      
      // ✅ Production logging
      targets: env.get('NODE_ENV') === 'production' ? [
        {
          target: 'pino/file',
          options: {
            destination: './storage/logs/app.log'
          },
          level: 'info'
        },
        {
          target: '@sentry/node',
          options: {
            dsn: env.get('SENTRY_DSN')
          },
          level: 'error'
        }
      ] : [
        {
          target: 'pino-pretty',
          options: {
            colorize: true
          }
        }
      ]
    }
  }
}
```

### Performance Monitoring

```typescript
// app/middleware/performance_monitoring_middleware.ts
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import logger from '@adonisjs/core/services/logger'

export default class PerformanceMonitoringMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const start = process.hrtime.bigint()
    const startMemory = process.memoryUsage().heapUsed

    try {
      await next()
    } finally {
      const end = process.hrtime.bigint()
      const endMemory = process.memoryUsage().heapUsed
      
      const duration = Number(end - start) / 1000000 // Convert to milliseconds
      const memoryDelta = endMemory - startMemory

      // ✅ Log performance metrics
      if (duration > 1000) { // Log slow requests
        logger.warn('Slow request detected', {
          method: ctx.request.method(),
          url: ctx.request.url(),
          duration: `${duration.toFixed(2)}ms`,
          memoryDelta: `${(memoryDelta / 1024 / 1024).toFixed(2)}MB`,
          statusCode: ctx.response.getStatus(),
          userId: ctx.auth?.user?.id
        })
      }

      // ✅ Add performance headers
      ctx.response.header('X-Response-Time', `${duration.toFixed(2)}ms`)
    }
  }
}
```

### Deployment Checklist

#### Pre-deployment

- [ ] Environment variables are properly configured
- [ ] Database migrations have been tested
- [ ] Application builds successfully
- [ ] All tests pass
- [ ] Security headers are configured
- [ ] SSL certificates are valid
- [ ] Backup strategy is in place
- [ ] Monitoring is configured

#### Deployment

- [ ] Deploy to staging environment first
- [ ] Run database migrations
- [ ] Verify health checks pass
- [ ] Test critical user journeys
- [ ] Monitor error rates and performance
- [ ] Verify all external integrations work

#### Post-deployment

- [ ] Monitor application logs
- [ ] Check performance metrics
- [ ] Verify database connections
- [ ] Test API endpoints
- [ ] Monitor error tracking
- [ ] Verify backup systems

### Rollback Strategy

```bash
#!/bin/bash
# rollback.sh

# ✅ Rollback script
set -e

PREVIOUS_VERSION=$1

if [ -z "$PREVIOUS_VERSION" ]; then
  echo "Usage: $0 <previous_version>"
  exit 1
fi

echo "Rolling back to version: $PREVIOUS_VERSION"

# Stop current application
docker compose down

# Restore previous image
docker tag myapp:$PREVIOUS_VERSION myapp:latest

# Rollback database if needed
# node ace migration:rollback --batch=1

# Start application
docker compose up -d

# Verify rollback
sleep 10
curl -f http://localhost:3333/health || {
  echo "Health check failed after rollback"
  exit 1
}

echo "Rollback completed successfully"
```

### Scaling Considerations

```yaml
# docker-compose.scale.yml
version: '3.8'

services:
  app:
    build: .
    deploy:
      replicas: 3
    ports:
      - "3333-3335:3333"
    environment:
      - NODE_ENV=production
    depends_on:
      - db
      - redis

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx-load-balancer.conf:/etc/nginx/nginx.conf
    depends_on:
      - app
```

### Sources

- [AdonisJS Deployment Guide](https://docs.adonisjs.com/guides/deployment)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Nginx Configuration](https://nginx.org/en/docs/)
- [GitHub Actions](https://docs.github.com/en/actions)