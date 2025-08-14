---
parent: sidekit
name: Documentation
description: Sidekit documentation
type: rule
---

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
