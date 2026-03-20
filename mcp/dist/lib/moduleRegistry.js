// Ordered exactly as in module_registry.md — order is significant for execution
export const MODULE_REGISTRY = [
    {
        key: "CTWalletKit",
        displayName: "CTWallet Kit",
        description: "Apple Wallet (PassKit) integration",
        type: "catalog",
        contractFile: "modules/CTWalletKit_doc.md",
    },
    {
        key: "Kingfisher",
        displayName: "Kingfisher",
        description: "Remote image loading and caching utility",
        type: "catalog",
        contractFile: "modules/Kingfisher_doc.md",
    },
    {
        key: "CTPlayerKit",
        displayName: "CTPlayer Kit",
        description: "Video Player Kit integration",
        type: "catalog",
        contractFile: "modules/CTPlayerKit_doc.md",
    },
    {
        key: "Analytics",
        displayName: "Analytics",
        description: "App analytics manager with YAnalytics + Firebase engine",
        type: "service",
        contractFile: "modules/Analytics_doc.md",
    },
    {
        key: "TemplateUIPackage",
        displayName: "TemplateUI Package",
        description: "Unified local UI package for CTAlertView, CTBottomSheetView, CTCarouselView, CTSnackBarView, and CTToastView",
        type: "catalog",
        contractFile: "modules/TempleteUIPackage_doc.md",
    },
    {
        key: "CTSlidingContainerView",
        displayName: "CTSlidingContainer View",
        description: "Configurable sidebar/drawer navigation container with gesture support",
        type: "catalog",
        contractFile: "modules/CTSlidingContainerView_doc.md",
        dependencies: ["TemplateUIPackage"],
    },
    {
        key: "CTSocialLoginKit",
        displayName: "CTSocialLogin Kit",
        description: "Social sign-in integration kit",
        type: "service",
        contractFile: "modules/CTSocialLoginKit_doc.md",
    },
    {
        key: "Keychain",
        displayName: "Keychain",
        description: "Secure string storage via iOS Keychain Services",
        type: "service",
        contractFile: "modules/Keychain_doc.md",
    },
    {
        key: "Logger",
        displayName: "Logger",
        description: "Centralized leveled logging utility",
        type: "service",
        contractFile: "modules/Logger_doc.md",
    },
    {
        key: "Network",
        displayName: "Network",
        description: "HTTP networking layer (Alamofire) + connectivity monitoring",
        type: "service",
        contractFile: "modules/Network_doc.md",
    },
    {
        key: "SwiftData",
        displayName: "SwiftData",
        description: "Apple-native model persistence (iOS 17+)",
        type: "service",
        contractFile: "modules/SwiftData_doc.md",
    },
    {
        key: "LocationManager",
        displayName: "Location Manager",
        description: "CoreLocation permission, live coordinates & state",
        type: "service",
        contractFile: "modules/LocationManager_doc.md",
    },
    {
        key: "NotificationManager",
        displayName: "Notification Manager",
        description: "Push/local notification permission & delivery",
        type: "service",
        contractFile: "modules/NotificationManager_doc.md",
    },
    {
        key: "AppTab",
        displayName: "App Tab",
        description: "TabView dashboard root with per-tab NavigationStack and independent routers",
        type: "structural",
        contractFile: "modules/AppTab_doc.md",
    },
];
// Modules that drive catalog routes / CatalogScreen
const CATALOG_MODULE_KEYS = [
    "CTWalletKit",
    "Kingfisher",
    "CTPlayerKit",
    "TemplateUIPackage",
    "CTSlidingContainerView",
];
// Modules that add a .catalog tab to AppTab's DashboardScreen
const APPTAB_CATALOG_TAB_TRIGGERS = [
    "CTWalletKit",
    "Kingfisher",
    "CTPlayerKit",
];
export function getModuleByKey(key) {
    return MODULE_REGISTRY.find((m) => m.key === key);
}
export function validateModules(modules) {
    const validKeys = new Set(MODULE_REGISTRY.map((m) => m.key));
    const valid = [];
    const invalid = [];
    for (const m of modules) {
        if (validKeys.has(m)) {
            valid.push(m);
        }
        else {
            invalid.push(m);
        }
    }
    return { valid, invalid };
}
export function resolveFinalAppStructName(appName) {
    return appName.endsWith("App") ? appName : `${appName}App`;
}
export function resolveGenerationPlan(spec) {
    const { appName, bundleId, architecture, modules } = spec;
    const catalogModules = modules.filter((m) => CATALOG_MODULE_KEYS.includes(m));
    const serviceModules = modules.filter((m) => !CATALOG_MODULE_KEYS.includes(m) && m !== "AppTab");
    const hasAppTab = modules.includes("AppTab");
    // Determine app root
    let appRoot;
    if (hasAppTab) {
        appRoot = "DashboardScreen";
    }
    else if (catalogModules.length > 0) {
        appRoot = "CatalogScreen";
    }
    else {
        appRoot = "HomeScreen";
    }
    // Determine AppTab's tabs
    const dashboardTabs = [];
    if (hasAppTab) {
        dashboardTabs.push("home");
        const hasCatalogTabTrigger = modules.some((m) => APPTAB_CATALOG_TAB_TRIGGERS.includes(m));
        if (hasCatalogTabTrigger) {
            dashboardTabs.push("catalog");
        }
    }
    // Contract execution order — AppTab is always absolutely last
    const coreContracts = [
        "generation/base_setup.md",
        "generation/foundation.md",
        "generation/architecture.md",
        "generation/quality.md",
    ];
    const moduleContracts = [
        // Catalog modules first (in registry order)
        ...MODULE_REGISTRY.filter((m) => catalogModules.includes(m.key)).map((m) => m.contractFile),
        // Service modules next (in registry order)
        ...MODULE_REGISTRY.filter((m) => serviceModules.includes(m.key)).map((m) => m.contractFile),
        // AppTab always last
        ...(hasAppTab
            ? [MODULE_REGISTRY.find((m) => m.key === "AppTab").contractFile]
            : []),
    ];
    return {
        appName,
        finalAppStructName: resolveFinalAppStructName(appName),
        bundleId,
        architecture,
        appRoot,
        dashboardTabs,
        contractExecutionOrder: [...coreContracts, ...moduleContracts],
        selectedModules: modules,
        catalogModules,
        serviceModules,
        hasAppTab,
    };
}
export function formatModuleListForDisplay() {
    return MODULE_REGISTRY.map((m) => `• ${m.key} — ${m.description}`).join("\n");
}
//# sourceMappingURL=moduleRegistry.js.map