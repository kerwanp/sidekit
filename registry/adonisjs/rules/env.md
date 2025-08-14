---
parent: adonisjs
name: Environment Variables
description: Guidelines for environment variables and configuration in AdonisJS 6
type: rule
---

## Environment Variables and Configuration

### Environment Validation

Environment variables MUST be validated in `start/env.ts`:

```typescript
// start/env.ts
import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  // ✅ App configuration
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  APP_KEY: Env.schema.string(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']),

  // ✅ Database configuration
  DB_HOST: Env.schema.string({ format: 'host' }),
  DB_PORT: Env.schema.number(),
  DB_USER: Env.schema.string(),
  DB_PASSWORD: Env.schema.string.optional(),
  DB_DATABASE: Env.schema.string(),

  // ✅ Redis configuration
  REDIS_HOST: Env.schema.string({ format: 'host' }),
  REDIS_PORT: Env.schema.number(),
  REDIS_PASSWORD: Env.schema.string.optional(),

  // ✅ Email configuration
  SMTP_HOST: Env.schema.string({ format: 'host' }),
  SMTP_PORT: Env.schema.number(),
  SMTP_USERNAME: Env.schema.string.optional(),
  SMTP_PASSWORD: Env.schema.string.optional(),

  // ✅ Third-party services
  AWS_ACCESS_KEY_ID: Env.schema.string.optional(),
  AWS_SECRET_ACCESS_KEY: Env.schema.string.optional(),
  AWS_BUCKET: Env.schema.string.optional(),
  AWS_REGION: Env.schema.string.optional(),

  // ✅ Social authentication
  GITHUB_CLIENT_ID: Env.schema.string.optional(),
  GITHUB_CLIENT_SECRET: Env.schema.string.optional(),
  GOOGLE_CLIENT_ID: Env.schema.string.optional(),
  GOOGLE_CLIENT_SECRET: Env.schema.string.optional(),

  // ✅ API keys
  STRIPE_SECRET_KEY: Env.schema.string.optional(),
  STRIPE_PUBLISHABLE_KEY: Env.schema.string.optional(),
  SENDGRID_API_KEY: Env.schema.string.optional(),

  // ✅ Feature flags
  ENABLE_DEBUG_MODE: Env.schema.boolean.optional(),
  ENABLE_ANALYTICS: Env.schema.boolean.optional(),
  MAINTENANCE_MODE: Env.schema.boolean.optional(),

  // ✅ Security settings
  SESSION_DRIVER: Env.schema.enum(['cookie', 'memory', 'redis'] as const),
  CORS_ENABLED: Env.schema.boolean(),
  RATE_LIMIT_ENABLED: Env.schema.boolean.optional(),
})
```

### Environment File Structure

#### .env (Development)

```env
# ✅ Application
NODE_ENV=development
PORT=3333
APP_KEY=your-32-character-secret-key
HOST=localhost
LOG_LEVEL=debug

# ✅ Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_DATABASE=myapp_development

# ✅ Redis
REDIS_HOST=localhost
REDIS_PORT=6379
# REDIS_PASSWORD=

# ✅ Email (Development)
SMTP_HOST=localhost
SMTP_PORT=1025
# SMTP_USERNAME=
# SMTP_PASSWORD=

# ✅ Development flags
ENABLE_DEBUG_MODE=true
ENABLE_ANALYTICS=false
MAINTENANCE_MODE=false

# ✅ Session
SESSION_DRIVER=cookie
CORS_ENABLED=true
```

#### .env.example (Template)

```env
# Application Configuration
NODE_ENV=development
PORT=3333
APP_KEY=
HOST=localhost
LOG_LEVEL=info

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=
DB_PASSWORD=
DB_DATABASE=

# Redis Configuration (Optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Email Configuration
SMTP_HOST=
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=

# AWS S3 Configuration (Optional)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_BUCKET=
AWS_REGION=us-east-1

# Third-party API Keys (Optional)
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
SENDGRID_API_KEY=

# Social Authentication (Optional)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Feature Flags
ENABLE_DEBUG_MODE=false
ENABLE_ANALYTICS=true
MAINTENANCE_MODE=false

# Security
SESSION_DRIVER=cookie
CORS_ENABLED=true
RATE_LIMIT_ENABLED=true
```

### Configuration Files

Configuration files MUST use environment variables:

```typescript
// config/app.ts
import env from '#start/env'

export default {
  // ✅ App settings
  appKey: env.get('APP_KEY'),
  http: {
    host: env.get('HOST'),
    port: env.get('PORT'),
    trustProxy: env.get('NODE_ENV') === 'production'
  },

  // ✅ Debug settings
  debug: env.get('ENABLE_DEBUG_MODE', false),
  
  // ✅ Feature flags
  features: {
    analytics: env.get('ENABLE_ANALYTICS', true),
    maintenanceMode: env.get('MAINTENANCE_MODE', false)
  }
}
```

```typescript
// config/database.ts
import env from '#start/env'

export default {
  connection: env.get('DB_CONNECTION', 'pg'),
  
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
      migrations: {
        naturalSort: true,
        paths: ['./database/migrations']
      },
      debug: env.get('NODE_ENV') === 'development'
    }
  }
}
```

```typescript
// config/redis.ts
import env from '#start/env'

export default {
  connection: 'main',
  
  connections: {
    main: {
      host: env.get('REDIS_HOST'),
      port: env.get('REDIS_PORT'),
      password: env.get('REDIS_PASSWORD', ''),
      db: 0,
      keyPrefix: ''
    }
  }
}
```

### Using Environment Variables

```typescript
// ✅ In services
import env from '#start/env'

export default class EmailService {
  private config = {
    host: env.get('SMTP_HOST'),
    port: env.get('SMTP_PORT'),
    username: env.get('SMTP_USERNAME'),
    password: env.get('SMTP_PASSWORD')
  }

  async sendEmail(to: string, subject: string, body: string) {
    if (!this.config.host) {
      throw new Error('SMTP configuration is missing')
    }
    // Send email logic
  }
}

// ✅ In controllers with feature flags
import env from '#start/env'

export default class AnalyticsController {
  async track({ request, response }: HttpContext) {
    if (!env.get('ENABLE_ANALYTICS')) {
      return response.noContent()
    }

    // Track analytics
    return response.json({ tracked: true })
  }
}

// ✅ In middleware
export default class MaintenanceMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    if (env.get('MAINTENANCE_MODE')) {
      return ctx.response.status(503).json({
        error: 'Service temporarily unavailable',
        message: 'The application is under maintenance'
      })
    }

    return await next()
  }
}
```

### Environment-Specific Configuration

```typescript
// config/cors.ts
import env from '#start/env'

export default {
  enabled: env.get('CORS_ENABLED'),
  
  // ✅ Different origins per environment
  origin: env.get('NODE_ENV') === 'production' 
    ? ['https://yourdomain.com', 'https://app.yourdomain.com']
    : true,
    
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE'],
  headers: true,
  exposeHeaders: [],
  credentials: true,
  maxAge: false
}
```

```typescript
// config/session.ts
import env from '#start/env'

export default {
  driver: env.get('SESSION_DRIVER'),
  
  cookieName: 'adonis-session',
  clearWithBrowser: false,
  
  // ✅ Secure cookies in production
  cookie: {
    domain: env.get('NODE_ENV') === 'production' ? '.yourdomain.com' : '',
    path: '/',
    maxAge: '2h',
    httpOnly: true,
    secure: env.get('NODE_ENV') === 'production',
    sameSite: false,
  }
}
```

### Environment Variable Best Practices

#### Naming Conventions

```env
# ✅ Correct: Use SCREAMING_SNAKE_CASE
DATABASE_URL=postgresql://user:pass@localhost/db
API_BASE_URL=https://api.example.com
ENABLE_FEATURE_X=true
MAX_UPLOAD_SIZE=10485760

# ❌ Incorrect: Mixed case or spaces
database_url=postgresql://user:pass@localhost/db
Api-Base-Url=https://api.example.com
enable feature x=true
```

#### Sensitive Data Handling

```typescript
// ✅ Correct: Optional sensitive variables
AWS_SECRET_ACCESS_KEY: Env.schema.string.optional(),
STRIPE_SECRET_KEY: Env.schema.string.optional(),

// ✅ Correct: Required in production only
JWT_SECRET: Env.schema.string.optional({
  validate: (value) => {
    if (env.get('NODE_ENV') === 'production' && !value) {
      throw new Error('JWT_SECRET is required in production')
    }
  }
})

// ✅ Correct: Default values for development
REDIS_PORT: Env.schema.number.optional(6379),
LOG_LEVEL: Env.schema.enum(['debug', 'info', 'warn', 'error']).optional('info')
```

#### Type Safety

```typescript
// ✅ Correct: Proper validation
export default class PaymentService {
  constructor() {
    if (!env.get('STRIPE_SECRET_KEY')) {
      throw new Error('Stripe configuration is required')
    }
  }

  async processPayment(amount: number) {
    const stripe = new Stripe(env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2023-10-16'
    })
    // Process payment
  }
}

// ✅ Correct: Feature flags
export default class FeatureService {
  isAnalyticsEnabled(): boolean {
    return env.get('ENABLE_ANALYTICS', false)
  }

  isMaintenanceMode(): boolean {
    return env.get('MAINTENANCE_MODE', false)
  }

  getMaxUploadSize(): number {
    return env.get('MAX_UPLOAD_SIZE', 10485760) // 10MB default
  }
}
```

### Testing with Environment Variables

```typescript
// tests/.env
NODE_ENV=test
PORT=3334
APP_KEY=test-app-key-32-characters-long
HOST=localhost
LOG_LEVEL=error

# Test database
DB_HOST=localhost
DB_PORT=5432
DB_USER=test_user
DB_PASSWORD=test_password
DB_DATABASE=myapp_test

# Disable external services in tests
ENABLE_ANALYTICS=false
ENABLE_EMAIL=false
STRIPE_SECRET_KEY=sk_test_fake_key
```

```typescript
// tests/unit/services/email_service.spec.ts
import { test } from '@japa/runner'
import env from '#start/env'

test.group('Email Service', () => {
  test('should handle missing SMTP configuration', async ({ assert }) => {
    // Temporarily override env for test
    const originalHost = env.get('SMTP_HOST')
    process.env.SMTP_HOST = ''
    
    const emailService = new EmailService()
    
    await assert.rejects(
      () => emailService.sendEmail('test@example.com', 'Test', 'Body'),
      'SMTP configuration is missing'
    )
    
    // Restore original value
    process.env.SMTP_HOST = originalHost
  })
})
```

### Common Anti-Patterns

```typescript
// ❌ Incorrect: Hardcoded values
const config = {
  database: {
    host: 'localhost',
    port: 5432,
    user: 'postgres'
  }
}

// ❌ Incorrect: Direct process.env access
const apiKey = process.env.API_KEY
const port = parseInt(process.env.PORT || '3333')

// ❌ Incorrect: No validation
const requiredValue = env.get('REQUIRED_VALUE') // Could be undefined

// ❌ Incorrect: Exposing secrets in logs
console.log('Database config:', {
  host: env.get('DB_HOST'),
  password: env.get('DB_PASSWORD') // Don't log passwords!
})

// ✅ Correct: Safe logging
console.log('Database config:', {
  host: env.get('DB_HOST'),
  password: env.get('DB_PASSWORD') ? '***' : undefined
})
```

### Environment Variable Documentation

Always document environment variables in your README.md:

```markdown
## Environment Variables

### Required

- `APP_KEY`: 32-character application encryption key
- `DB_HOST`: Database server hostname
- `DB_PORT`: Database server port
- `DB_USER`: Database username
- `DB_PASSWORD`: Database password
- `DB_DATABASE`: Database name

### Optional

- `REDIS_HOST`: Redis server hostname (default: localhost)
- `REDIS_PORT`: Redis server port (default: 6379)
- `ENABLE_ANALYTICS`: Enable analytics tracking (default: true)
- `LOG_LEVEL`: Application log level (default: info)

### Development Only

- `ENABLE_DEBUG_MODE`: Enable debug mode (default: false)
- `SMTP_HOST`: SMTP server for local email testing
```

### Sources

- [Environment Variables](https://docs.adonisjs.com/guides/environment-variables)
- [Configuration](https://docs.adonisjs.com/guides/configuration)
- [Validation](https://docs.adonisjs.com/guides/environment-variables#validation)