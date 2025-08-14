# Agent guidelines and rules

This file provides guidance to Coding agents when working with code in this repository.

=== adonisjs guidelines ===

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

## Controllers

### Rules

- Controllers MUST be placed inside the `app/controllers` folder
- Controllers MUST be named using `<name>_controller.ts` (eg. `auth_controller.ts`)
- Controllers MUST ONLY export a default class (eg. `AuthController`)

### Example

#### Dependency injection

Dependencies (services) must be injected inside the constructor. When doing so `@inject` decorator MUST be added to the class.

```ts
@inject()
export default class PostsController {
  constructor(private postsService: PostsService) {}

  store() {}
  view() {}
}
```

### Sources

- More information are available here <https://docs.adonisjs.com/guides/basics/controllers>
