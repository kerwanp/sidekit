---
parent: adonisjs
name: Structure
description: Guidelines for the Adonis structure
type: rule
---

## Structure

```
root/
├── app/                  # Core application logic (MVC pattern)
│   ├── controllers/      # HTTP request handlers
│   ├── exceptions/       # Custom error handling and exception classes
│   ├── middleware/       # Request/response interceptors
│   └── models/           # Lucid ORM models (Active Record pattern)
├── bin/                  # Executable scripts
├── config/               # Application configuration files
├── database/             # Database-related files
│   ├── factories/        # Model factories
│   └── migrations/       # Database migration files
├── start/                # Application bootstrapping
│   ├── env.ts            # Environment variable validation
│   ├── kernel.ts         # Middleware registration
│   └── routes.ts         # Route definitions
├── tests/                # Test suites
│   ├── bootstrap.ts      # Test framework setup (japa)
│   ├── unit/             # Unit tests
│   ├── e2e/              # E2E tests
│   └── functional/       # Integration tests
├── ace.js                # AdonisJS CLI configuration
├── adonisrc.ts           # AdonisJS runtime configuration
├── eslint.config.js      # Code linting rules
├── package.json          # Dependencies and scripts
└── tsconfig.json         # TypeScript configuration
```

### Rules

- You MUST NOT modify `ace.js` file
