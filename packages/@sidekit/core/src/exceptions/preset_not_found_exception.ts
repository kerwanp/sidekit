import { Exception } from "./exception.js";

export class PresetNotFoundException extends Exception {
  constructor(id: string, message: string) {
    super(`Preset '${id}' not found: ${message}`);
  }
}
