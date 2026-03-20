import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import {
  ensureGeneratorRoot,
  getDocsPath,
} from "./generatorRoot.js";

/**
 * Loads a contract markdown file from resources/TemplateApp/docs/
 * e.g. contractLoader.load("generation/base_setup.md")
 *      contractLoader.load("modules/CTWalletKit_doc.md")
 */
export async function loadContract(relativePath: string): Promise<string> {
  const root = await ensureGeneratorRoot();
  const fullPath = join(root, "resources", "TemplateApp", "docs", relativePath);

  if (!existsSync(fullPath)) {
    throw new Error(
      `Contract file not found: ${fullPath}\n` +
        `Check IOS_GENERATOR_ROOT / IOS_GENERATOR_REPO_URL or monorepo layout.`
    );
  }

  const content = await readFile(fullPath, "utf-8");
  return content;
}

/**
 * Loads multiple contracts in order and returns them as an array of
 * { path, content } objects. Missing files are collected and thrown together.
 */
export async function loadContracts(
  relativePaths: string[]
): Promise<Array<{ path: string; content: string }>> {
  const missing: string[] = [];
  const results: Array<{ path: string; content: string }> = [];

  for (const path of relativePaths) {
    try {
      const content = await loadContract(path);
      results.push({ path, content });
    } catch {
      missing.push(path);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing contract files:\n${missing.map((p) => `  • ${p}`).join("\n")}`
    );
  }

  return results;
}

/**
 * Loads the spec template for reference.
 */
export async function loadSpecTemplate(): Promise<string> {
  const root = await ensureGeneratorRoot();
  const fullPath = join(root, "resources", "spec_template.md");

  if (!existsSync(fullPath)) {
    throw new Error(`spec_template.md not found at: ${fullPath}`);
  }

  return readFile(fullPath, "utf-8");
}

export type RepoStructureResult = {
  repoRoot: string;
  docsPath: string;
  exists: boolean;
  error?: string;
};

/**
 * Ensures the generator repo is available (clone/env/legacy) and reports layout.
 */
export async function verifyRepoStructure(): Promise<RepoStructureResult> {
  try {
    const repoRoot = await ensureGeneratorRoot();
    const docsPath = getDocsPath(repoRoot);
    return {
      repoRoot,
      docsPath,
      exists: true,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const hint = process.env.IOS_GENERATOR_ROOT?.trim() ?? "";
    return {
      repoRoot: hint || "(could not resolve generator root)",
      docsPath: hint ? getDocsPath(hint) : "(unknown)",
      exists: false,
      error: message,
    };
  }
}
