import { MODULE_REGISTRY } from "../lib/moduleRegistry.js";
export const listModulesTool = {
    name: "list_ios_modules",
    description: "Lists all available modules for iOS app generation. Use this to show the user which modules are available during the project creation wizard, before calling assemble_generation_prompt.",
    inputSchema: {
        type: "object",
        properties: {},
        required: [],
    },
};
export function handleListModules() {
    const catalogModules = MODULE_REGISTRY.filter((m) => m.type === "catalog");
    const serviceModules = MODULE_REGISTRY.filter((m) => m.type === "service");
    const structuralModules = MODULE_REGISTRY.filter((m) => m.type === "structural");
    const formatGroup = (title, modules) => {
        const rows = modules.map((m) => `  • ${m.key.padEnd(26)} ${m.description}${m.dependencies ? ` [requires: ${m.dependencies.join(", ")}]` : ""}`);
        return [`### ${title}`, ...rows].join("\n");
    };
    return [
        "# Available iOS Modules",
        "",
        formatGroup("Catalog Modules (add a visual catalog route to the app)", catalogModules),
        "",
        formatGroup("Service Modules (shared services, no catalog route)", serviceModules),
        "",
        formatGroup("Structural Modules (change the app root layout)", structuralModules),
        "",
        "---",
        "",
        "**Module keys** (use these exact strings in the `modules` parameter of `create_ios_app`):",
        "",
        MODULE_REGISTRY.map((m) => `  ${m.key}`).join("\n"),
        "",
        "**Notes:**",
        "  • CTSlidingContainerView requires TemplateUIPackage (included automatically if missing).",
        "  • AppTab adds a TabView root. It gets a .catalog tab if CTWalletKit, Kingfisher, or CTPlayerKit are also selected.",
        "  • Select no modules to get a minimal app with just HomeScreen as the root.",
        "  • Pass the chosen module keys to assemble_generation_prompt once the user has confirmed their spec.",
    ].join("\n");
}
//# sourceMappingURL=listModules.js.map