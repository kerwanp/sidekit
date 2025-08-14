import { Exception } from "./exception.js";

export class RuleNotFoundException extends Exception {
  constructor(id: string, message: string) {
    super(`Rule '${id}' not found: ${message}`);
  }
}
