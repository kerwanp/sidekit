import { z } from "zod";
import { schemas } from "./schemas.js";

export type SidekitKit = z.infer<typeof schemas.kit>;

export type SidekitRule = z.infer<typeof schemas.rule>;
