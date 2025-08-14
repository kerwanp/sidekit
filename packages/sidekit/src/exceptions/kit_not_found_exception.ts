import { Exception } from "./exception.js";

export class KitNotFoundException extends Exception {
  constructor(id: string) {
    super(`Could not find kit '${id}' locally and remotely`); // TODO: Add helper to list available kits
  }
}
