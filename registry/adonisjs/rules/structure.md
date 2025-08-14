---
parent: adonisjs
name: Project Structure
description: Guidelines for organizing AdonisJS 6 applications
type: rule
---

## Project Structure

### Standard AdonisJS 6 Structure

```
root/
├── app/
│   ├── controllers/         # HTTP controllers
│   ├── middleware/         # Custom middleware
│   ├── models/             # Lucid ORM models
│   ├── services/           # Business logic services
│   ├── validators/         # VineJS validation schemas
│   ├── exceptions/         # Custom exceptions
│   └── policies/           # Authorization policies
├── bin/
│   ├── console.ts          # Console commands entry
│   ├── server.ts           # HTTP server entry
│   └── test.ts             # Testing entry
├── config/
│   ├── app.ts              # App configuration
│   ├── database.ts         # Database configuration
│   ├── cors.ts             # CORS configuration
│   ├── session.ts          # Session configuration
│   └── auth.ts             # Authentication config
├── database/
│   ├── migrations/         # Database migrations
│   ├── seeders/           # Database seeders
│   └── factories/         # Model factories
├── public/                 # Static assets
├── resources/
│   ├── views/             # Edge templates
│   ├── js/                # Frontend JavaScript
│   └── css/               # Frontend CSS
├── start/
│   ├── routes.ts          # Route definitions
│   ├── kernel.ts          # HTTP kernel
│   └── env.ts             # Environment validation
├── tests/
│   ├── functional/        # End-to-end tests
│   ├── unit/             # Unit tests
│   └── bootstrap.ts      # Test bootstrap
├── types/                 # TypeScript definitions
├── .env                   # Environment variables
├── .env.example          # Environment template
├── adonisrc.ts           # AdonisJS configuration
├── package.json          # Dependencies
└── tsconfig.json         # TypeScript config
```

### Mandatory Rules

- ALWAYS use the `app/` directory for application domain logic
- Controllers MUST be placed in `app/controllers/`
- Models MUST be placed in `app/models/`  
- Middleware MUST be placed in `app/middleware/`
- Services MUST be placed in `app/services/`
- Validators MUST be placed in `app/validators/`
- Routes MUST be defined in `start/routes.ts`
- Configuration files MUST be placed in `config/`
- Database files MUST be placed in `database/`
- NEVER commit `.env` files to version control
- ALWAYS provide `.env.example` with sample values

### File Naming Conventions

- Controllers: PascalCase with "Controller" suffix (e.g., `UsersController.ts`)
- Models: PascalCase, singular (e.g., `User.ts`)
- Middleware: PascalCase with "Middleware" suffix (e.g., `AuthMiddleware.ts`)
- Services: PascalCase with "Service" suffix (e.g., `UserService.ts`)
- Validators: PascalCase with "Validator" suffix (e.g., `UserValidator.ts`)
- Routes: snake_case for file names (e.g., `user_routes.ts`)
- Config files: snake_case (e.g., `database.ts`)

### Import Aliases

AdonisJS 6 provides sub-path imports via `package.json`:

```json
{
  "imports": {
    "#controllers/*": "./app/controllers/*.js",
    "#models/*": "./app/models/*.js",
    "#middleware/*": "./app/middleware/*.js",
    "#services/*": "./app/services/*.js",
    "#validators/*": "./app/validators/*.js",
    "#config/*": "./config/*.js",
    "#types/*": "./types/*.js"
  }
}
```

ALWAYS use these import aliases instead of relative paths:

```typescript
// ✅ Correct
import User from '#models/user'
import UsersController from '#controllers/users_controller'

// ❌ Incorrect  
import User from '../models/User.js'
import UsersController from './UsersController.js'
```

### Examples

#### Basic Controller Structure

```typescript
// app/controllers/users_controller.ts
import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'

export default class UsersController {
  async index({ response }: HttpContext) {
    const users = await User.all()
    return response.json(users)
  }

  async show({ params, response }: HttpContext) {
    const user = await User.findOrFail(params.id)
    return response.json(user)
  }
}
```

#### Service Layer Structure

```typescript
// app/services/user_service.ts
import User from '#models/user'
import { Exception } from '@adonisjs/core/exceptions'

export default class UserService {
  async createUser(data: { email: string; password: string }) {
    const existingUser = await User.findBy('email', data.email)
    if (existingUser) {
      throw new Exception('User already exists', { status: 409 })
    }

    return await User.create(data)
  }

  async getUserProfile(userId: number) {
    return await User.query()
      .where('id', userId)
      .preload('posts')
      .firstOrFail()
  }
}
```

#### Route Organization

```typescript
// start/routes.ts
import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'

// API routes
router.group(() => {
  router.get('users', '#controllers/users_controller.index')
  router.post('users', '#controllers/users_controller.store')
  router.get('users/:id', '#controllers/users_controller.show')
  router.put('users/:id', '#controllers/users_controller.update')
  router.delete('users/:id', '#controllers/users_controller.destroy')
}).prefix('api/v1').middleware([middleware.auth()])

// Auth routes
router.group(() => {
  router.post('login', '#controllers/auth_controller.login')
  router.post('register', '#controllers/auth_controller.register')
  router.post('logout', '#controllers/auth_controller.logout')
}).prefix('auth')
```

### Sources

- [AdonisJS 6 Folder Structure](https://docs.adonisjs.com/guides/folder-structure)
- [Import Aliases](https://docs.adonisjs.com/guides/folder-structure#import-aliases)
- [File Structure Best Practices](https://docs.adonisjs.com/guides/folder-structure)