export declare function getDocsPath(repoRoot: string): string;
export declare function isValidGeneratorRoot(root: string): boolean;
/**
 * Resolves the generator repo root exactly once per process (with caching).
 * Order: IOS_GENERATOR_ROOT → clone IOS_GENERATOR_REPO_URL → legacy monorepo layout.
 */
export declare function ensureGeneratorRoot(): Promise<string>;
/** For tests or after changing env in the same process. */
export declare function resetGeneratorRootCache(): void;
//# sourceMappingURL=generatorRoot.d.ts.map