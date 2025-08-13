---
parent: adonisjs
name: Controllers
description: Guidelines for writing controllers
type: rule
---

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
