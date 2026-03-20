import type { GenerationPlan } from "../types.js";
import { loadContracts } from "./contractLoader.js";

/**
 * Builds the complete generation prompt by:
 * 1. Prepending a machine-readable spec block
 * 2. Loading all contracts in the resolved execution order
 * 3. Concatenating them with clear section separators
 *
 * The resulting prompt can be sent directly to any LLM to execute
 * the full iOS project generation.
 */
export async function buildGenerationPrompt(
  plan: GenerationPlan
): Promise<string> {
  const contracts = await loadContracts(plan.contractExecutionOrder);

  const sections: string[] = [];

  // ── Section 1: Project Spec ──────────────────────────────────────────────
  sections.push(buildSpecSection(plan));

  // ── Section 2: Execution Instructions ───────────────────────────────────
  sections.push(buildExecutionInstructionsSection(plan));

  // ── Section 3: Contracts (in order) ─────────────────────────────────────
  for (const { path, content } of contracts) {
    const label = contractLabel(path);
    sections.push(
      [
        `${"─".repeat(72)}`,
        `## CONTRACT: ${label}`,
        `## Path: resources/TemplateApp/docs/${path}`,
        `${"─".repeat(72)}`,
        "",
        content,
      ].join("\n")
    );
  }

  // ── Section 4: Completion marker ────────────────────────────────────────
  sections.push(
    [
      `${"─".repeat(72)}`,
      "## COMPLETION",
      `${"─".repeat(72)}`,
      "",
      `After executing all contracts above, output:`,
      `"Setup complete. Project ready at output/${plan.appName}/"`,
    ].join("\n")
  );

  return sections.join("\n\n");
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildSpecSection(plan: GenerationPlan): string {
  const moduleList =
    plan.selectedModules.length > 0
      ? plan.selectedModules.join(", ")
      : "None";

  const archDisplay: Record<string, string> = {
    "MVVM+Builder+Router": "MVVM + Builder + Router",
    VIPER: "VIPER",
    CleanArchitecture: "Clean Architecture",
  };

  return [
    "# iOS App Generation Request",
    "",
    "You are an AI agent executing a structured iOS project generation.",
    "Read each CONTRACT section below in order and execute it exactly.",
    "Do NOT skip steps. Do NOT reorder contracts.",
    "",
    "## Project Specification",
    "",
    "```",
    `App Name:          ${plan.appName}`,
    `App Struct Name:   ${plan.finalAppStructName}`,
    `Bundle ID:         ${plan.bundleId}`,
    `Architecture:      ${archDisplay[plan.architecture] ?? plan.architecture}`,
    `App Root:          ${plan.appRoot}`,
    `Selected Modules:  ${moduleList}`,
    `Catalog Modules:   ${plan.catalogModules.join(", ") || "None"}`,
    `Service Modules:   ${plan.serviceModules.join(", ") || "None"}`,
    `Has AppTab:        ${plan.hasAppTab}`,
    `Dashboard Tabs:    ${plan.dashboardTabs.join(", ") || "N/A"}`,
    "```",
  ].join("\n");
}

function buildExecutionInstructionsSection(plan: GenerationPlan): string {
  const steps = plan.contractExecutionOrder.map((c, i) => {
    const label = contractLabel(c);
    return `  ${i + 1}. ${label}`;
  });

  const rootNote = (() => {
    switch (plan.appRoot) {
      case "HomeScreen":
        return "→ Wire HomeRouter + HomeScreen as app root. App entry file uses @State private var router = HomeRouter().";
      case "CatalogScreen":
        return "→ Wire CatalogRouter + CatalogScreen as app root (catalog modules are selected). Do NOT wire HomeScreen as root.";
      case "DashboardScreen":
        return [
          "→ Wire DashboardRouter + DashboardScreen as app root (AppTab selected).",
          `   Dashboard tabs: ${plan.dashboardTabs.join(", ")}.`,
          "   App entry file uses @State private var dashboardRouter = DashboardRouter().",
        ].join("\n");
    }
  })();

  return [
    "## Execution Order",
    "",
    steps.join("\n"),
    "",
    "## Root Screen Rule",
    "",
    rootNote,
    "",
    "## Critical Constraints",
    "",
    "- Root router MUST be declared as @State on the App struct — NEVER as a let inside WindowGroup body.",
    "- Mirror internal catalog screens from resources/TemplateApp/TemplateApp/Features/Catalog/InternalScreens/ — do NOT rewrite from scratch.",
    "- Never copy WalletCatalogBuilder.swift from source — create it fresh to accept CatalogRouter.",
    "- Never copy Dashboard template files verbatim (they depend on CTRemoteConfigKit which is not present).",
    "- Design tokens (RadiusToken, ColorToken, etc.) are already present from the foundation step — do NOT copy again.",
    "- AppTab runs LAST among module contracts.",
  ].join("\n");
}

function contractLabel(path: string): string {
  const filename = path.split("/").pop() ?? path;
  return filename.replace(/_doc\.md$/, "").replace(/\.md$/, "");
}
