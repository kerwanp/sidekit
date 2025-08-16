# Agent guidelines and rules

This file provides guidance to Coding agents when working with code in this repository.

SIDEKIT HAS BEEN RENAMED TO VANUPIED
=== sidekit guidelines ===

## Documentation

Sidekit is a utility tool for deterministically managing coding agent rules and guidelines. It also provide a registry of predifined rules.

### Usage

- `sidekit ls` - List available guideline kits
- `sidekit ls <kit>` - List available rules and presets for a specific kit
- `sidekit add <kit> <rule_name>` - Add a rule to the configuration and generate agent files
- `sidekit generate` - Generate agent files

### Custom rules

You can create custom rules inside `.sidekit/rules` folder and reference them inside `.sidekit/config.json`

#### Example

.sidekit/rules/example.md

```md
---
parent: workflow
name: Example rule
description: Example description of the rule
type: rule
---

This content will be added to the generated agent files.
```

.sidekit/config.json

```json
{
  "rules": ["rules/example.md"]
}
```

## Important

When modifying rules manually (without the command line) you must generate the agent files using `sidekit generate` command.

=== workflow guidelines ===

## Sidekit setup

When installing new libraries/dependencies you MUST look for available Sidekit rules and install the recommended preset.

Steps:

1. List available kits `sidekit ls`
2. Add the recommended preset inside `.sidekit/config.json` (eg. `adonisjs:recommended`)
3. Generate agent files using `sidekit generate`
