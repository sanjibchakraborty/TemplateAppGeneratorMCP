# iOS App Generator — MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that exposes the **Template-App-Generator-iOS** system as tools any MCP-compatible AI client can call.

## How It Works

The server reads the contract markdown files living in `resources/TemplateApp/docs/` and composes them into a structured generation prompt. The connected LLM agent executes the prompt step-by-step to produce a complete Xcode project under `output/{AppName}/`.

```
Client (Cursor / Claude Desktop / etc.)
  ↓ calls create_ios_app(appName, bundleId, architecture, modules)
MCP Server
  ↓ validates input, resolves execution plan, loads contracts
  ↓ returns assembled prompt
LLM Agent
  ↓ executes contracts in order
output/{AppName}/   ← fully scaffolded Xcode project
```

---

## Prerequisites

- Node.js ≥ 18
- [Git](https://git-scm.com/) on `PATH` (only if you use `IOS_GENERATOR_REPO_URL` cloning)
- A way to point the server at the **generator** repo (see below)

### Generator repo resolution (in order)

1. **`IOS_GENERATOR_ROOT`** — absolute path to an existing clone. No Git clone is performed.
2. **`IOS_GENERATOR_REPO_URL`** — remote or `file:///...` URL. The server clones or updates into:
   - `$XDG_CACHE_HOME/ios-app-generator/repo`, or  
   - `~/.cache/ios-app-generator/repo` when `XDG_CACHE_HOME` is unset.
3. **Monorepo fallback** — if the MCP package still lives under `mcp/` inside the generator repo, that repo root is detected automatically (`resources/TemplateApp/docs` must exist).

Optional: **`IOS_GENERATOR_REF`** — branch or tag for clone/fetch (default: `main`).

After you move this package to its own repo, set **`IOS_GENERATOR_ROOT`** or **`IOS_GENERATOR_REPO_URL`** in the environment (Cursor `mcp.json` env block, shell profile, or `launchd` plist).

---

## Setup

```bash
cd mcp
npm install
npm run build
```

---

## Two Ways to Run

### Option A — HTTP server (recommended, like Figma Desktop)

Start the server once, keep it running, and any MCP client connects via URL:

```bash
# Default port 3846
npm run start:http

# Custom port
PORT=4000 npm run start:http
```

**Registering with Cursor** (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "ios-app-generator": {
      "url": "http://127.0.0.1:3846/mcp",
      "env": {
        "IOS_GENERATOR_REPO_URL": "https://github.com/your-org/Template-App-Generator-iOS.git",
        "IOS_GENERATOR_REF": "main"
      }
    }
  }
}
```

Omit `env` when using the monorepo layout; add it once the MCP lives in a separate repo. For HTTP transport, clients often cannot inject env into the server process—export `IOS_GENERATOR_*` in the shell (or plist) that runs `npm run start:http` instead.

**Registering with Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "ios-app-generator": {
      "url": "http://127.0.0.1:3846/mcp"
    }
  }
}
```

Health check endpoint: `http://127.0.0.1:3846/health`

---

### Option B — stdio (Cursor/Claude Desktop launches it per-session)

No server to manage — the client starts and stops the process automatically.

**Cursor / Claude Desktop config:**

```json
{
  "mcpServers": {
    "ios-app-generator": {
      "command": "node",
      "args": ["/absolute/path/to/Template-App-Generator-iOS/mcp/dist/index.js"],
      "env": {
        "IOS_GENERATOR_REPO_URL": "https://github.com/your-org/Template-App-Generator-iOS.git",
        "IOS_GENERATOR_REF": "main"
      }
    }
  }
}
```

Use `IOS_GENERATOR_ROOT` instead of `IOS_GENERATOR_REPO_URL` if you already have a local clone.

---

## Running as a Background Service (optional)

To keep the HTTP server always running on login, use a `launchd` plist (macOS):

```bash
# Create ~/Library/LaunchAgents/com.ios-app-generator.mcp.plist
# Then: launchctl load ~/Library/LaunchAgents/com.ios-app-generator.mcp.plist
```

Or simply run `npm run start:http` in a persistent terminal session.

---

## Available Tools

### `list_ios_modules`

Lists all available modules grouped by type (catalog / service / structural).

**No parameters.**

```
→ Returns a formatted list of all 14 modules with descriptions and keys.
```

---

### `create_ios_app`

Generates a complete iOS app project.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `appName` | string | ✅ | PascalCase app name (e.g. `MyApp`, `CardGame`) |
| `bundleId` | string | ✅ | Reverse-domain bundle ID (e.g. `com.company.myapp`) |
| `architecture` | enum | ✅ | `MVVM+Builder+Router` \| `VIPER` \| `CleanArchitecture` |
| `modules` | string[] | — | Module keys to include (default: `[]`) |

**Example call:**

```json
{
  "appName": "FinanceApp",
  "bundleId": "com.company.financeapp",
  "architecture": "MVVM+Builder+Router",
  "modules": ["Logger", "Network", "Keychain", "AppTab"]
}
```

**Returns:** A generation prompt with:
- Resolved project spec and execution plan
- All contracts concatenated in the correct order
- Critical constraints injected per the module selection

---

## Module Keys

| Key | Type | Description |
|---|---|---|
| `CTWalletKit` | catalog | Apple Wallet (PassKit) integration |
| `Kingfisher` | catalog | Remote image loading and caching |
| `CTPlayerKit` | catalog | Video Player Kit |
| `Analytics` | service | YAnalytics + Firebase |
| `TemplateUIPackage` | catalog | CTAlertView, CTBottomSheetView, CTCarouselView, CTSnackBarView, CTToastView |
| `CTSlidingContainerView` | catalog | Sidebar/drawer navigation |
| `CTSocialLoginKit` | service | Social sign-in |
| `Keychain` | service | Secure string storage |
| `Logger` | service | Leveled logging |
| `Network` | service | Alamofire + connectivity |
| `SwiftData` | service | Apple-native persistence (iOS 17+) |
| `LocationManager` | service | CoreLocation |
| `NotificationManager` | service | Push + local notifications |
| `AppTab` | structural | TabView dashboard root |

---

## Module Selection Logic

The server enforces all rules automatically:

| Selection | App Root | Notes |
|---|---|---|
| No modules | `HomeScreen` | Minimal app |
| Any catalog module | `CatalogScreen` | Catalog feature becomes root |
| AppTab | `DashboardScreen` | TabView wraps Home/Catalog |
| AppTab + CTWalletKit/Kingfisher/CTPlayerKit | `DashboardScreen` | Adds `.catalog` tab |

**Execution order rules:**
1. `base_setup` → `foundation` → `architecture` → `quality`
2. Catalog module contracts (in registry order)
3. Service module contracts (in registry order)
4. `AppTab` always **last**

---

## Development

```bash
# Build
npm run build

# Watch mode (auto-recompile on save)
npm run dev
```
