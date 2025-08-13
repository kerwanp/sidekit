import { z } from "zod";
import { schemas } from "./schemas.js";

export type Sidekit = z.infer<typeof schemas.sidekit>;

export type SidekitRule = z.infer<typeof schemas.rule>;
