---
parent: adonisjs
name: Environment variables
description: Managing environment variables
type: rule
---

## Environment variables

### Rules

- You MUST NEVER use `process.env` to access an environment variable. Instead use `import { env } from '#start/env'`

## Examples

### start/env.ts

The `start/env.ts` file contains the schema for the environment variables. Every environment variable must be present here.

```ts
import { Env } from "@adonisjs/core/env";

export default await Env.create(new URL("../", import.meta.url), {
  OPENAI_API_KEY: Env.schema.string(),
}
```

### Usage

```ts
import { env } from "#start/env";

console.log(env.OPENAI_API_KEY);
```

### Sources

- More information are available here <https://docs.adonisjs.com/guides/getting-started/environment-variables>
