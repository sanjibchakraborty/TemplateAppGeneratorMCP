import type { ModuleKey, ModuleDefinition, AppSpec, GenerationPlan } from "../types.js";
export declare const MODULE_REGISTRY: ModuleDefinition[];
export declare function getModuleByKey(key: ModuleKey): ModuleDefinition | undefined;
export declare function validateModules(modules: string[]): {
    valid: ModuleKey[];
    invalid: string[];
};
export declare function resolveFinalAppStructName(appName: string): string;
export declare function resolveGenerationPlan(spec: AppSpec): GenerationPlan;
export declare function formatModuleListForDisplay(): string;
//# sourceMappingURL=moduleRegistry.d.ts.map