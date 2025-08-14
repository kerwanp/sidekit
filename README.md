<div align="center">
<br/>

## Sidekit

### Boost your coding agent with pre-defined rules

<br/>
</div>

<div align="center">

[🔨 Setup](#🔨-setup) • [🚀 Configure rules](#🚀-configure-rules)

[Contribute](#contributing) • [License](#license)

</div>

# 🔨 Setup

First install **Sidekit** globally using [npm](https://www.npmjs.com/).

```shell
npm install -g sidekit
```

Navigate to your repository and initialize **Sidekit**.

```shell
sidekit init
```

# 🚀 Configure rules

Rules are a list of guidelines that will:

- Help your agent to have a better understanding of your stack
- Guide your agent behavior
- Enforce the agent to perform certain tasks
- Ensure your agent does not perform certain modifications

## Using the command line

You can configure rules by using the `add` command followed by the name of the kit.
You will then be prompted with a list of preset and rules you can enable.

```shell
sidekit add <kit>

sidekit add adonisjs
```

The list of available kits can be found in the [registry folder](https://github.com/kerwanp/sidekit/tree/main/registry)

## Using the configuration file

**Sidekit** configuration is available inside `.sidekit/config.json`.

Rules and presets must be configured using `<kit_name>:<rule_name>` (eg. `worfklow:commit-conventional`)

```json
{
  "rules": ["workflow:commit-conventional"],
  "presets": ["adonisjs:recommended"]
}
```

You can then generate the agent documentation using the following command:

```shell
sidekit generate
```

## Custom rules

You can provide custom guidelines to your coding agent by creating markdown files inside the `.sidekit/rules` folder.

Here is an example of a rule that will enforce the agent to self-review modifications to create a feedback loop on itself.

```md
---
parent: worfklow
name: Self-review
description: Ensure the AI perform a self-review
---

## Task reporting

**IMPORTANT**: When you have finished a task or done modifications you must review yourself.

Steps:

1. Run git diff to see recent changes
2. Focus on modified files
3. Generate review
4. Perform modifications based on the review

Review checklit:

- Code is simple and readable
- Functions and variables are well-named
- No duplicated code
- Proper error handling
- No exposed secrets or API keys
- Input validation implemented
- Good test coverage
- Performance considerations addressed

Provide feedback organized by priority:

- Critical issues (must fix)
- Warnings (should fix)
- Suggestions (consider improving)

Include specific examples of how to fix issues.
```

Available properties:

- `parent`: Used to group rules inside the generated files
- `name`: Used to identify this rule (not used by agent)
- `description`: Further information about the goal of the rule (not used by agent)
- `type`: Must always be `rule`

You can then generate the agent documentation using the following command:

```shell
sidekit generate
```
