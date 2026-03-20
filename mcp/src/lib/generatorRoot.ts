import { execFile as execFileCb } from "node:child_process";
import { existsSync } from "fs";
import { mkdir, rm } from "fs/promises";
import { homedir } from "os";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Absolute path to an existing generator repo (highest priority). */
const ENV_ROOT = "IOS_GENERATOR_ROOT";
/** Git URL of the generator repo; clone/update into the local cache when set. */
const ENV_REPO_URL = "IOS_GENERATOR_REPO_URL";
/** Branch or tag to clone/fetch (default: main). */
const ENV_REF = "IOS_GENERATOR_REF";

const DOCS_REL = join("resources", "TemplateApp", "docs");

export function getDocsPath(repoRoot: string): string {
  return join(repoRoot, DOCS_REL);
}

export function isValidGeneratorRoot(root: string): boolean {
  return existsSync(getDocsPath(root));
}

/**
 * When the MCP package still lives inside Template-App-Generator-iOS under `mcp/`,
 * generator root is three levels up from dist/lib (or src/lib).
 */
function getLegacyMonorepoGeneratorRoot(): string {
  return resolve(__dirname, "../../..");
}

function getCacheBaseDir(): string {
  const xdg = process.env.XDG_CACHE_HOME;
  const base = xdg && xdg.length > 0 ? xdg : join(homedir(), ".cache");
  return join(base, "ios-app-generator");
}

function getCloneTargetDir(): string {
  return join(getCacheBaseDir(), "repo");
}

function hasGitDir(dir: string): boolean {
  return existsSync(join(dir, ".git"));
}

function execGit(
  command: string,
  args: string[],
  options?: { maxBuffer?: number }
): Promise<void> {
  return new Promise((resolve, reject) => {
    execFileCb(command, args, options ?? {}, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/**
 * Branches whose names contain `/` are not valid as a bare `git checkout` pathspec
 * until the remote-tracking ref exists. Use an explicit fetch refspec, then checkout
 * `refs/remotes/origin/<ref>` (detached HEAD is fine for reading files).
 */
async function fetchAndCheckoutRef(dir: string, ref: string): Promise<void> {
  const branchSpec = `refs/heads/${ref}:refs/remotes/origin/${ref}`;
  const remoteTip = `refs/remotes/origin/${ref}`;

  try {
    await execGit(
      "git",
      ["-C", dir, "fetch", "--depth", "100", "origin", branchSpec],
      { maxBuffer: 64 * 1024 * 1024 }
    );
    await execGit("git", ["-C", dir, "checkout", "--force", remoteTip]);
    return;
  } catch {
    /* try tag */
  }

  try {
    await execGit(
      "git",
      [
        "-C",
        dir,
        "fetch",
        "--depth",
        "100",
        "origin",
        `refs/tags/${ref}:refs/tags/${ref}`,
      ],
      { maxBuffer: 64 * 1024 * 1024 }
    );
    await execGit("git", ["-C", dir, "checkout", "--force", `refs/tags/${ref}`]);
    return;
  } catch {
    /* fall through */
  }

  await execGit("git", ["-C", dir, "fetch", "origin"], {
    maxBuffer: 64 * 1024 * 1024,
  });
  await execGit("git", ["-C", dir, "checkout", "--force", ref]);
}

async function syncGitClone(url: string, ref: string, dir: string): Promise<void> {
  const cacheBase = getCacheBaseDir();
  await mkdir(cacheBase, { recursive: true });

  const hasGit = hasGitDir(dir);

  if (!hasGit) {
    if (existsSync(dir)) {
      await rm(dir, { recursive: true, force: true });
    }
    try {
      await execGit("git", ["clone", "--depth", "1", "--branch", ref, url, dir], {
        maxBuffer: 64 * 1024 * 1024,
      });
    } catch {
      await execGit("git", ["clone", "--depth", "1", url, dir], {
        maxBuffer: 64 * 1024 * 1024,
      });
      await fetchAndCheckoutRef(dir, ref);
    }
    return;
  }

  await fetchAndCheckoutRef(dir, ref);
}

function generatorResolutionError(): Error {
  return new Error(
    [
      "Could not locate the iOS generator repo (expected resources/TemplateApp/docs).",
      "Set one of:",
      `  ${ENV_ROOT}=/path/to/Template-App-Generator-iOS`,
      `  ${ENV_REPO_URL}=https://github.com/org/Template-App-Generator-iOS.git`,
      `  (optional) ${ENV_REF}=main   # branch or tag`,
      "Or run the MCP package from inside the generator monorepo (mcp/ nested under repo root).",
    ].join("\n")
  );
}

async function resolveGeneratorRootOnce(): Promise<string> {
  const fromEnv = process.env[ENV_ROOT]?.trim();
  if (fromEnv) {
    const root = resolve(fromEnv);
    if (!isValidGeneratorRoot(root)) {
      throw new Error(
        `${ENV_ROOT} is set to "${root}" but ${getDocsPath(root)} was not found.`
      );
    }
    return root;
  }

  const repoUrl = process.env[ENV_REPO_URL]?.trim();
  if (repoUrl) {
    const ref = (process.env[ENV_REF] ?? "main").trim() || "main";
    const dir = getCloneTargetDir();
    await syncGitClone(repoUrl, ref, dir);
    if (!isValidGeneratorRoot(dir)) {
      throw new Error(
        `After cloning ${ENV_REPO_URL}, expected docs at ${getDocsPath(dir)} — check ref and repo layout.`
      );
    }
    return dir;
  }

  const legacy = getLegacyMonorepoGeneratorRoot();
  if (isValidGeneratorRoot(legacy)) {
    return legacy;
  }

  throw generatorResolutionError();
}

let rootPromise: Promise<string> | null = null;

/**
 * Resolves the generator repo root exactly once per process (with caching).
 * Order: IOS_GENERATOR_ROOT → clone IOS_GENERATOR_REPO_URL → legacy monorepo layout.
 */
export function ensureGeneratorRoot(): Promise<string> {
  if (!rootPromise) {
    rootPromise = resolveGeneratorRootOnce().catch((err) => {
      rootPromise = null;
      throw err;
    });
  }
  return rootPromise;
}

/** For tests or after changing env in the same process. */
export function resetGeneratorRootCache(): void {
  rootPromise = null;
}
