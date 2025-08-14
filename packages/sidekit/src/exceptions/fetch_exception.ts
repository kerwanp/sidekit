import { Exception } from "./exception.js";

export class FetchException extends Exception {
  constructor() {
    super(`Fetch error`);
  }
}
