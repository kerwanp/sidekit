---
parent: workflow
name: Automation
description: Enforce the AI to check for available rules when installing new dependencies.
type: rule
---

## Sidekit setup

When installing new libraries/dependencies you MUST look for available Sidekit rules and install the recommended preset.

Steps:

1. List available kits `sidekit ls`
2. Add the recommended preset inside `.sidekit/config.json` (eg. `adonisjs:recommended`)
3. Generate agent files using `sidekit generate`
