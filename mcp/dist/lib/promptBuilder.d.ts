import type { GenerationPlan } from "../types.js";
/**
 * Builds the complete generation prompt by:
 * 1. Prepending a machine-readable spec block
 * 2. Loading all contracts in the resolved execution order
 * 3. Concatenating them with clear section separators
 *
 * The resulting prompt can be sent directly to any LLM to execute
 * the full iOS project generation.
 */
export declare function buildGenerationPrompt(plan: GenerationPlan): Promise<string>;
//# sourceMappingURL=promptBuilder.d.ts.map