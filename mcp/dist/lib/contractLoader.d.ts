/**
 * Loads a contract markdown file from resources/TemplateApp/docs/
 * e.g. contractLoader.load("generation/base_setup.md")
 *      contractLoader.load("modules/CTWalletKit_doc.md")
 */
export declare function loadContract(relativePath: string): Promise<string>;
/**
 * Loads multiple contracts in order and returns them as an array of
 * { path, content } objects. Missing files are collected and thrown together.
 */
export declare function loadContracts(relativePaths: string[]): Promise<Array<{
    path: string;
    content: string;
}>>;
/**
 * Loads the spec template for reference.
 */
export declare function loadSpecTemplate(): Promise<string>;
export type RepoStructureResult = {
    repoRoot: string;
    docsPath: string;
    exists: boolean;
    error?: string;
};
/**
 * Ensures the generator repo is available (clone/env/legacy) and reports layout.
 */
export declare function verifyRepoStructure(): Promise<RepoStructureResult>;
//# sourceMappingURL=contractLoader.d.ts.map