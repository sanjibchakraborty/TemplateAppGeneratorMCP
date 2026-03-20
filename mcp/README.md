# iOS App Generator — MCP Server

[MCP](https://modelcontextprotocol.io) server for the iOS generator: loads contracts from the generator repo and returns prompts for **`ios_project_wizard`** / **`list_ios_modules`**.

**Needs:** Node.js 18+, Git on `PATH` if you use `IOS_GENERATOR_REPO_URL`.

---

## How it works

The server reads contract markdown under **`resources/TemplateApp/docs/`** in the generator repo, resolves the execution plan from the wizard spec, and assembles one structured **generation prompt**. The AI client runs that prompt in the workspace and scaffolds the Xcode project under **`output/{AppName}/`**.

```
Cursor (or another MCP client)
  → calls ios_project_wizard (and optionally list_ios_modules)
MCP server
  → validates input, loads contracts in order, returns the full prompt
AI agent
  → executes each contract step in the workspace
output/{AppName}/   ← generated app
```

---

## Install

1. Clone this repo and go to the `mcp` folder (where `package.json` is).

   ```bash
   cd mcp
   npm install
   npm run build
   ```

2. Add the server to **`~/.cursor/mcp.json`** with **`url`** and **`env`** (same shape you use in Cursor). The name under `mcpServers` must be **`ios-app-generator`** so `npm run start:http` can find this block.

   ```json
   {
     "mcpServers": {
       "ios-app-generator": {
         "url": "http://127.0.0.1:3846/mcp",
         "env": {
           "IOS_GENERATOR_REPO_URL": "https://github.com/your-org/your-generator-repo.git",
           "IOS_GENERATOR_REF": "main"
         }
       }
     }
   }
   ```

   - **`IOS_GENERATOR_REF`** — branch or tag; slashes are OK (e.g. `Sanjib/MCP-Wizard-Generator-Repo-Clone`).
   - Instead of cloning, you can set **`IOS_GENERATOR_ROOT`** to an absolute path to a local generator checkout (omit **`IOS_GENERATOR_REPO_URL`**).

3. Start the server (reads **`env`** from that `mcp.json` via `scripts/start-http.mjs`):

   ```bash
   npm run start:http
   ```

4. Reload MCP in Cursor. Keep this terminal running while you use Cursor.

**Other port:** `PORT=4000 npm run start:http`  
**Health:** `http://127.0.0.1:3846/health`  
**Bad clone / cache:** `rm -rf ~/.cache/ios-app-generator/repo` and start again.

---

## Stdio (optional)

If you prefer Cursor to start Node for you, use **`command`** + **`args`** pointing at **`dist/index.js`** and the same **`env`** block; then you don’t run `start:http`.

---

## Dev

```bash
npm run build
npm run dev
```
