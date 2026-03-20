import { validateModules, resolveGenerationPlan, resolveFinalAppStructName, } from "../lib/moduleRegistry.js";
import { buildGenerationPrompt } from "../lib/promptBuilder.js";
import { verifyRepoStructure } from "../lib/contractLoader.js";
// ─── Tool Definition ─────────────────────────────────────────────────────────
export const createIosAppTool = {
    name: "assemble_generation_prompt",
    description: [
        "Assembles all iOS generation contracts in the correct order and returns a single",
        "prompt that an agent must execute in full to scaffold an Xcode project.",
        "",
        "This is a BACKEND assembly tool — not a user-facing action.",
        "It is called as the FINAL step of the project-creation-flow wizard,",
        "only after the user has confirmed their spec (app name, bundle ID, architecture, modules).",
        "",
        "Call list_ios_modules first if you need to show the user which modules are available.",
    ].join("\n"),
    inputSchema: {
        type: "object",
        properties: {
            appName: {
                type: "string",
                description: "App name in PascalCase (e.g. MyApp, CardGame, FinanceApp). " +
                    "If it does not end with 'App', the suffix is appended automatically " +
                    "only for the app entry struct — the folder/project name stays as-is.",
            },
            bundleId: {
                type: "string",
                description: "Reverse-domain bundle identifier (e.g. com.company.myapp). " +
                    "Lowercase, dot-separated, minimum two segments.",
            },
            architecture: {
                type: "string",
                enum: ["MVVM+Builder+Router", "VIPER", "CleanArchitecture"],
                description: "Architecture pattern for the project. " +
                    "'MVVM+Builder+Router' is recommended for most new projects.",
            },
            modules: {
                type: "array",
                items: { type: "string" },
                description: "List of module keys to include. Pass an empty array for a minimal app. " +
                    "Use list_ios_modules to see all available modules and their keys.",
                default: [],
            },
        },
        required: ["appName", "bundleId", "architecture"],
    },
};
export async function handleAssembleGenerationPrompt(input) {
    const { appName, bundleId, architecture, modules = [] } = input;
    // ── Validation ────────────────────────────────────────────────────────────
    const appNameErrors = validateAppName(appName);
    if (appNameErrors) {
        return errorResponse("Invalid appName", appNameErrors);
    }
    const bundleIdErrors = validateBundleId(bundleId);
    if (bundleIdErrors) {
        return errorResponse("Invalid bundleId", bundleIdErrors);
    }
    const validArchitectures = [
        "MVVM+Builder+Router",
        "VIPER",
        "CleanArchitecture",
    ];
    if (!validArchitectures.includes(architecture)) {
        return errorResponse("Invalid architecture", `Must be one of: ${validArchitectures.join(", ")}`);
    }
    const { valid: validModules, invalid: invalidModules } = validateModules(modules);
    if (invalidModules.length > 0) {
        return errorResponse("Unknown modules", `These module keys are not in the registry: ${invalidModules.join(", ")}\n` +
            "Call list_ios_modules to see valid keys.");
    }
    // ── Repo structure check ──────────────────────────────────────────────────
    const repoCheck = await verifyRepoStructure();
    if (!repoCheck.exists) {
        return errorResponse("Repo structure not found", `Expected contracts at: ${repoCheck.docsPath}\n` +
            `Repo root: ${repoCheck.repoRoot}\n` +
            (repoCheck.error ? `Detail: ${repoCheck.error}\n` : "") +
            `Fix: IOS_GENERATOR_ROOT or IOS_GENERATOR_REPO_URL (optional IOS_GENERATOR_REF), or monorepo layout.`);
    }
    // ── Build plan & prompt ───────────────────────────────────────────────────
    const spec = {
        appName,
        bundleId,
        architecture: architecture,
        modules: validModules,
    };
    const plan = resolveGenerationPlan(spec);
    let prompt;
    try {
        prompt = await buildGenerationPrompt(plan);
    }
    catch (err) {
        return errorResponse("Failed to load contracts", err instanceof Error ? err.message : String(err));
    }
    // ── Return plan summary + prompt ──────────────────────────────────────────
    const summary = buildPlanSummary(plan);
    return [summary, "", "─".repeat(72), "", prompt].join("\n");
}
// ─── Helpers ─────────────────────────────────────────────────────────────────
function validateAppName(name) {
    if (!name || name.trim().length === 0)
        return "App name cannot be empty.";
    if (!/^[A-Z][a-zA-Z0-9]*$/.test(name)) {
        return ("App name must be PascalCase: start with an uppercase letter, " +
            "contain only letters and digits, no spaces or special characters. " +
            `Got: "${name}"`);
    }
    return null;
}
function validateBundleId(id) {
    if (!id || id.trim().length === 0)
        return "Bundle ID cannot be empty.";
    if (!/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/.test(id)) {
        return ("Bundle ID must be reverse-domain format (e.g. com.company.myapp): " +
            "lowercase letters and digits only, minimum two dot-separated segments. " +
            `Got: "${id}"`);
    }
    return null;
}
function buildPlanSummary(plan) {
    const moduleList = plan.selectedModules.length > 0
        ? plan.selectedModules.join(", ")
        : "None";
    const archDisplay = {
        "MVVM+Builder+Router": "MVVM + Builder + Router",
        VIPER: "VIPER",
        CleanArchitecture: "Clean Architecture",
    };
    const steps = plan.contractExecutionOrder.map((c, i) => {
        const label = c.split("/").pop()?.replace(/_doc\.md$/, "").replace(/\.md$/, "") ?? c;
        return `  ${(i + 1).toString().padStart(2)}. ${label}`;
    });
    return [
        "# Generation Plan",
        "",
        `  App Name:         ${plan.appName}`,
        `  Struct Name:      ${resolveFinalAppStructName(plan.appName)}`,
        `  Bundle ID:        ${plan.bundleId}`,
        `  Architecture:     ${archDisplay[plan.architecture] ?? plan.architecture}`,
        `  App Root:         ${plan.appRoot}`,
        `  Modules:          ${moduleList}`,
        plan.hasAppTab
            ? `  Dashboard Tabs:   ${plan.dashboardTabs.join(", ")}`
            : "",
        "",
        "## Contract Execution Order",
        "",
        steps.join("\n"),
        "",
        "## Instructions for the Agent",
        "",
        "Execute the prompt below step-by-step.",
        "Do not skip or reorder any CONTRACT section.",
        "Output files to: output/" + plan.appName + "/",
    ]
        .filter((line) => line !== undefined)
        .join("\n");
}
function errorResponse(title, detail) {
    return [`# Error: ${title}`, "", detail].join("\n");
}
//# sourceMappingURL=createIosApp.js.map