import { join } from "pathe";
import { resolveKit } from "../kit/resolve/resolve_kit.js";
import { readFile } from "../utils/file.js";
import { normalizeRuleId } from "./normalize_rule_id.js";
import { parseRule } from "./parse_rule.js";
import { RuleNotFoundException } from "../exceptions/rule_not_found_exception.js";
import { FileException } from "../exceptions/file_exception.js";

export type LoadRuleOptions = {
  path: string;
  id: string;
};

export async function loadRule({ id, path }: LoadRuleOptions) {
  const normalized = normalizeRuleId(id);

  if (normalized.source === "remote") {
    const kit = await resolveKit(normalized.kitId);

    const output = kit.rules?.find(
      (rule) => rule.id === normalized.ruleId && rule.type === "rule",
    );

    if (!output) {
      throw new RuleNotFoundException(
        id,
        `${normalized.kitId} kit does not provide this rule`,
      );
    }

    return output;
  }

  if (normalized.source === "local") {
    try {
      const content = await readFile(join(path, ".sidekit", normalized.path));
      return parseRule(normalized.path, content);
    } catch (e) {
      if (e instanceof FileException) {
        throw new RuleNotFoundException(id, e.message);
      }
    }
  }

  throw new RuleNotFoundException(id, `cannot resolve rule from any source`);
}
