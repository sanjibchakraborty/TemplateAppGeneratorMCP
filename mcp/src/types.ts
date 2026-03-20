export type Architecture = "MVVM+Builder+Router" | "VIPER" | "CleanArchitecture";

export type ModuleKey =
  | "CTWalletKit"
  | "Kingfisher"
  | "CTPlayerKit"
  | "Analytics"
  | "TemplateUIPackage"
  | "CTSlidingContainerView"
  | "CTSocialLoginKit"
  | "Keychain"
  | "Logger"
  | "Network"
  | "SwiftData"
  | "LocationManager"
  | "NotificationManager"
  | "AppTab";

export type ModuleType = "catalog" | "service" | "structural";

export type AppRoot = "HomeScreen" | "CatalogScreen" | "DashboardScreen";

export interface ModuleDefinition {
  key: ModuleKey;
  displayName: string;
  description: string;
  type: ModuleType;
  contractFile: string;
  dependencies?: ModuleKey[];
}

export interface AppSpec {
  appName: string;
  bundleId: string;
  architecture: Architecture;
  modules: ModuleKey[];
}

export interface GenerationPlan {
  appName: string;
  finalAppStructName: string;
  bundleId: string;
  architecture: Architecture;
  appRoot: AppRoot;
  dashboardTabs: string[];
  contractExecutionOrder: string[];
  selectedModules: ModuleKey[];
  catalogModules: ModuleKey[];
  serviceModules: ModuleKey[];
  hasAppTab: boolean;
}
