---
parent: adonisjs
name: Exceptions
description: Documentation on how to manage exceptions
type: rule
---

## Exceptions

### Rules

- You MUST NOT throw classic errors. Instead you should create new ones or reuse existing.
- The error messages MUST be clear and contain the context
- You MUST NEVER EVER log credentials or sensitive informations
- Exception files MUST be stored inside `app/exceptions` folder
- Exception names must be suffixed with `Exception` (eg. `ExampleException`)
- Exceptions MUST extends `Exception` from `@adonisjs/core/exceptions`

### Examples

#### Custom exception

```ts
import { Exception } from "@adonisjs/core/exceptions";

export default class ExampleException extends Exception {
  static status = 403; // Response status code
  static code = "E_EXAMPLE"; // Identifier used for logging

  constructor(user: User, message: string) {
    super(`Example error with user ${user.id}: ${message}`);
  }
}
```

### Sources

- More information are available here <https://docs.adonisjs.com/guides/basics/exception-handling>
