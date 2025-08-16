import { format } from "prettier";
import registry from "../../registry/registry.json";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { loadKitConfig } from "sidekit/kit";
import sanitizeHtml from "sanitize-html";

type Entry = (typeof registry)["kits"][number];

for (const entry of registry.kits) {
  await createDocumentation(entry);
}

async function createDocumentation(entry: Entry) {
  const docsPath = new URL(
    `../content/docs/registry/${entry.id}/`,
    import.meta.url,
  );

  const metaPath = new URL("meta.json", docsPath);

  await mkdir(docsPath, { recursive: true });

  await writeFile(
    metaPath,
    await format(
      JSON.stringify({
        title: entry.name,
        description: entry.description,
      }),
      {
        filepath: fileURLToPath(metaPath),
      },
    ),
  );

  await createIndexPage(entry);
  await createRulesPage(entry);
}

async function createIndexPage(entry: Entry) {
  const path = new URL(
    `../content/docs/registry/${entry.id}/index.mdx`,
    import.meta.url,
  );

  await createPage(
    {
      title: entry.name,
      description: `${entry.name} kit`,
      content: `
<Cards>
  <Card title="Rules">HEEEY</Card>
  <Card title="Agents">HEEEY</Card>
  <Card title="MCPs">HEEEY</Card>
</Cards>
`,
    },
    new URL("index.mdx", path),
  );
}

async function createRulesPage(entry: Entry) {
  const output: string[] = [];
  const path = new URL(
    `../content/docs/registry/${entry.id}/rules.mdx`,
    import.meta.url,
  );

  const { rules, presets } = await loadKitConfig({
    cwd: fileURLToPath(new URL(`../../registry/${entry.id}`, import.meta.url)),
  });

  output.push(`## Presets`);

  for (const [name, rules] of Object.entries(presets)) {
    output.push(`### ${entry.id}:${name}`);

    for (const rule of rules) {
      output.push(`- [${entry.id}:${rule}](#${entry.id}${rule})`);
    }
  }

  output.push(`## Rules`);
  for (const rule of rules) {
    output.push(
      ...[
        `### ${entry.id}:${rule.id}`,
        `${rule.description}`,
        "````mdx",
        rule.content,
        "````",
      ],
    );
  }

  await createPage(
    {
      title: "Rules",
      description: `${entry.name} rules`,
      content: output.join("\n"),
    },
    new URL("rules.mdx", path),
  );
}

type Page = {
  title: string;
  description: string;
  content: string;
};

async function createPage(page: Page, path: URL) {
  const content = `---
title: ${page.title}
description: ${page.description}
---

${page.content}
`;

  await writeFile(path, content);
}
