import {
  validateModules,
  resolveGenerationPlan,
  MODULE_REGISTRY,
} from "../lib/moduleRegistry.js";
import { buildGenerationPrompt } from "../lib/promptBuilder.js";
import { verifyRepoStructure } from "../lib/contractLoader.js";
import type { Architecture, AppSpec, ModuleKey } from "../types.js";

// ─── Tool Definition ─────────────────────────────────────────────────────────

export const wizardTool = {
  name: "ios_project_wizard",
  description: [
    "The ONLY entry point for creating an iOS app. Call this immediately when a user",
    "mentions creating, generating, or building an iOS app — before asking any question.",
    "",
    "This tool drives a step-by-step wizard. Call it with ONLY the values you have",
    "explicitly collected from the user so far — never guess, infer, or assume any value.",
    "The tool returns the exact next instruction for you to follow.",
    "",
    "Typical flow:",
    "  1. User says 'create an iOS app' → call with no arguments",
    "  2. Tool says 'ask for app name' → you ask → user replies",
    "  3. Call again with appName set → tool says 'ask for bundle ID + architecture'",
    "  4. Call again with bundleId + architecture added → tool says 'ask for modules'",
    "  5. Call again with modules added → tool returns spec summary for confirmation",
    "  6. User confirms → call again with confirmed=true → tool returns generation prompt",
    "  7. Execute the generation prompt in full",
  ].join("\n"),
  inputSchema: {
    type: "object" as const,
    properties: {
      appName: {
        type: "string",
        description:
          "PascalCase app name (e.g. MyApp, CardGame). " +
          "Only set this after the user has explicitly typed their app name.",
      },
      bundleId: {
        type: "string",
        description:
          "Reverse-domain bundle ID (e.g. com.company.myapp). " +
          "Only set after the user has provided or confirmed it.",
      },
      architecture: {
        type: "string",
        enum: ["MVVM+Builder+Router", "VIPER", "CleanArchitecture"],
        description:
          "Architecture pattern. Only set after the user has chosen one.",
      },
      modules: {
        type: "array",
        items: { type: "string" },
        description:
          "Module keys chosen by the user. Only set after the user has selected from the list. " +
          "Pass an empty array [] explicitly if the user chose no modules.",
      },
      confirmed: {
        type: "boolean",
        description:
          "Set to true ONLY after the user has explicitly said 'yes', 'go', or a clear " +
          "affirmative to the spec summary. Do not set this based on your own judgment.",
      },
    },
    required: [],
  },
};

// ─── Input Type ───────────────────────────────────────────────────────────────

export interface WizardInput {
  appName?: string;
  bundleId?: string;
  architecture?: string;
  modules?: string[];
  confirmed?: boolean;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function handleWizard(input: WizardInput): Promise<string> {
  const { appName, bundleId, architecture, modules, confirmed } = input;

  // ── Step 1: No app name yet → ask for it ─────────────────────────────────
  if (!appName) {
    return [
      "## Wizard Step 1 — App Name",
      "",
      "Ask the user (plain text, no tool call):",
      '  "What is your app name? Use PascalCase — e.g. MyApp, CardGame, FinanceApp."',
      "",
      "Once you have their answer, call ios_project_wizard again with appName set.",
    ].join("\n");
  }

  // Validate app name
  const nameError = validateAppName(appName);
  if (nameError) {
    return [
      "## Wizard Step 1 — App Name Invalid",
      "",
      `Error: ${nameError}`,
      "",
      "Tell the user the name is invalid and ask them to try again.",
      "Call ios_project_wizard again with the corrected appName.",
    ].join("\n");
  }

  // ── Step 2: No bundle ID or architecture yet → ask for both ──────────────
  if (!bundleId || !architecture) {
    const defaultBundle = `com.company.${appName.toLowerCase()}`;
    return [
      "## Wizard Step 2 — Bundle ID & Architecture",
      "",
      "Ask the user these two questions using AskQuestion (single-select):",
      "",
      "Question 1 — bundle_id:",
      `  Prompt: "Bundle identifier?"`,
      `  Options:`,
      `    • "Use ${defaultBundle} (default)"  → maps to bundleId: "${defaultBundle}"`,
      `    • "I'll type it in the chat"         → ask them to type it, wait for reply`,
      "",
      "Question 2 — architecture:",
      `  Prompt: "Which architecture pattern?"`,
      `  Options:`,
      `    • "MVVM + Builder + Router (recommended)"  → maps to architecture: "MVVM+Builder+Router"`,
      `    • "VIPER"                                   → maps to architecture: "VIPER"`,
      `    • "Clean Architecture"                      → maps to architecture: "CleanArchitecture"`,
      "",
      "Once both are collected, call ios_project_wizard again with appName + bundleId + architecture set.",
    ].join("\n");
  }

  // Validate bundle ID
  const bundleError = validateBundleId(bundleId);
  if (bundleError) {
    return [
      "## Wizard Step 2 — Bundle ID Invalid",
      "",
      `Error: ${bundleError}`,
      "",
      "Tell the user the bundle ID is invalid and ask them to provide a valid one.",
      "Call ios_project_wizard again with the corrected bundleId.",
    ].join("\n");
  }

  const validArchitectures: Architecture[] = [
    "MVVM+Builder+Router",
    "VIPER",
    "CleanArchitecture",
  ];
  if (!validArchitectures.includes(architecture as Architecture)) {
    return [
      "## Wizard Step 2 — Architecture Invalid",
      "",
      `Error: Unknown architecture "${architecture}". Must be one of: ${validArchitectures.join(", ")}`,
      "",
      "Ask the user to choose again and call ios_project_wizard with a valid architecture.",
    ].join("\n");
  }

  // ── Step 3: No modules yet → show module list, ask for selection ──────────
  if (modules === undefined) {
    const moduleOptions = MODULE_REGISTRY.map(
      (m) => `    • "${m.key}" — ${m.description}`
    ).join("\n");

    return [
      "## Wizard Step 3 — Module Selection",
      "",
      "Ask the user using AskQuestion (multi-select):",
      `  Prompt: "Which modules to include? (select all that apply)"`,
      "",
      "Options (use these exact keys):",
      moduleOptions,
      `    • (select nothing / choose None) → pass modules: []`,
      "",
      "Once the user has made their selection, call ios_project_wizard again with",
      "appName + bundleId + architecture + modules set.",
      "(Pass modules: [] explicitly if the user wants no modules.)",
    ].join("\n");
  }

  // Validate modules
  const { valid: validModules, invalid: invalidModules } =
    validateModules(modules);
  if (invalidModules.length > 0) {
    return [
      "## Wizard Step 3 — Invalid Modules",
      "",
      `Unknown module keys: ${invalidModules.join(", ")}`,
      "",
      "Show the user the valid list and ask them to choose again.",
      "Call ios_project_wizard again with corrected modules.",
    ].join("\n");
  }

  // ── Step 4: All collected but not confirmed yet → show summary ────────────
  if (!confirmed) {
    const archDisplay: Record<string, string> = {
      "MVVM+Builder+Router": "MVVM + Builder + Router",
      VIPER: "VIPER",
      CleanArchitecture: "Clean Architecture",
    };
    const moduleList =
      validModules.length > 0 ? validModules.join(", ") : "None";

    return [
      "## Wizard Step 4 — Confirm Spec",
      "",
      "Show this spec summary to the user (plain text, no tool call):",
      "",
      "```",
      "Here's your project spec — ready to generate?",
      "",
      `  App Name:     ${appName}`,
      `  Bundle ID:    ${bundleId}`,
      `  Architecture: ${archDisplay[architecture] ?? architecture}`,
      `  Modules:      ${moduleList}`,
      "",
      'Type "yes" or "go" to start, or tell me what to change.',
      "```",
      "",
      "Wait for the user's response.",
      "If they confirm (yes / go / proceed / looks good), call ios_project_wizard again",
      "with all the same values PLUS confirmed: true.",
      "If they request changes, update the relevant value and call ios_project_wizard again",
      "without confirmed so the summary is shown again.",
    ].join("\n");
  }

  // ── Step 5: All collected and confirmed → assemble and return prompt ──────
  const repoCheck = await verifyRepoStructure();
  if (!repoCheck.exists) {
    return [
      "## Error — Generator Repo Not Available",
      "",
      `Expected contracts at: ${repoCheck.docsPath}`,
      `Repo root: ${repoCheck.repoRoot}`,
      repoCheck.error ? `Detail: ${repoCheck.error}` : "",
      "",
      "Fix: set IOS_GENERATOR_ROOT to a clone of the generator repo, or set IOS_GENERATOR_REPO_URL " +
        "(optional IOS_GENERATOR_REF, default main). Or keep the MCP package under mcp/ inside that repo.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  const spec: AppSpec = {
    appName,
    bundleId,
    architecture: architecture as Architecture,
    modules: validModules,
  };

  const plan = resolveGenerationPlan(spec);

  let prompt: string;
  try {
    prompt = await buildGenerationPrompt(plan);
  } catch (err) {
    return [
      "## Error — Failed to Load Contracts",
      "",
      err instanceof Error ? err.message : String(err),
    ].join("\n");
  }

  const steps = plan.contractExecutionOrder.map((c, i) => {
    const label =
      c.split("/").pop()?.replace(/_doc\.md$/, "").replace(/\.md$/, "") ?? c;
    return `  ${(i + 1).toString().padStart(2)}. ${label}`;
  });

  const archDisplay: Record<string, string> = {
    "MVVM+Builder+Router": "MVVM + Builder + Router",
    VIPER: "VIPER",
    CleanArchitecture: "Clean Architecture",
  };

  const header = [
    "## Generation Starting — Execute Every Step Below",
    "",
    `  App Name:     ${plan.appName}`,
    `  Bundle ID:    ${plan.bundleId}`,
    `  Architecture: ${archDisplay[plan.architecture] ?? plan.architecture}`,
    `  App Root:     ${plan.appRoot}`,
    `  Modules:      ${plan.selectedModules.join(", ") || "None"}`,
    plan.hasAppTab
      ? `  Dashboard Tabs: ${plan.dashboardTabs.join(", ")}`
      : "",
    "",
    "Execution order:",
    steps.join("\n"),
    "",
    "─".repeat(72),
  ]
    .filter(Boolean)
    .join("\n");

  return [header, "", prompt].join("\n");
}

// ─── Validation helpers ───────────────────────────────────────────────────────

function validateAppName(name: string): string | null {
  if (!name.trim()) return "App name cannot be empty.";
  if (!/^[A-Z][a-zA-Z0-9]*$/.test(name)) {
    return `"${name}" is not PascalCase. Must start with uppercase, letters/digits only, no spaces.`;
  }
  return null;
}

function validateBundleId(id: string): string | null {
  if (!id.trim()) return "Bundle ID cannot be empty.";
  if (!/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/.test(id)) {
    return `"${id}" is not a valid bundle ID. Use reverse-domain format: com.company.appname`;
  }
  return null;
}
