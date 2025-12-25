# WSL Ubuntu Migration Plan - Budgeting App

## Overview
Migrate development from Windows (`C:\Users\Bullzeye\Desktop\Development\`) to WSL Ubuntu (`~/projects/`) for better performance and Linux ecosystem benefits.

**Current State:** Node v20.19.5 on Windows
**Target State:** Node v22 LTS on WSL Ubuntu

---

## Phase 1: VS Code + WSL Setup

### 1.1 Install Remote-WSL Extension (Windows VS Code)
```powershell
# In Windows - install extension
code --install-extension ms-vscode-remote.remote-wsl
```

### 1.2 Navigate to WSL Ubuntu
```powershell
# From Windows Terminal or PowerShell
wsl
```

```bash
# You're now in Ubuntu - check where you are
pwd
# Should show /home/your-username

# Create projects folder
mkdir -p ~/projects
cd ~/projects
```

### 1.3 Open VS Code from WSL
```bash
# From WSL terminal, navigate to project and open VS Code
cd ~/projects/budgeting-app-nuxt
code .
```
This opens VS Code with WSL integration - all terminals will run in Linux.

---

## Phase 2: Install Development Tools in WSL

### 2.1 Update Ubuntu & Install Prerequisites

**Understanding the commands:**

**`sudo`** - "Super User DO" - runs command as administrator (like "Run as Administrator" in Windows). Required for system-level changes.

**`apt`** - Advanced Package Tool - Ubuntu's package manager (like Windows Store + npm combined for system software).

```bash
sudo apt update
```
Downloads the latest **list** of available packages from Ubuntu's servers. Does NOT install anything - just refreshes the catalog so your system knows what versions exist. Think of it like refreshing a webpage to see current prices.

```bash
sudo apt upgrade -y
```
Actually **installs** newer versions of packages you already have. The `-y` flag auto-confirms "yes" to prompts.

**Tip:** You can chain these with `&&` which runs second command only if first succeeds:
```bash
sudo apt update && sudo apt upgrade -y
```

Now install the tools:
```bash
sudo apt install -y curl wget git build-essential xdg-utils wslu
```

**What each package does:**

| Package | Purpose |
|---------|---------|
| `curl` | Command-line tool to transfer data from URLs. Downloads files from terminal. |
| `wget` | Another download tool (similar to curl). Some scripts use one or the other. |
| `git` | Version control. WSL may have it, but this ensures it's installed. |
| `build-essential` | Meta-package that installs: `gcc` (C compiler), `g++` (C++ compiler), `make` (build tool), `libc-dev` (C library). |
| `xdg-utils` | Standard Linux desktop utilities. Provides `xdg-open` which many scripts expect. |
| `wslu` | WSL Utilities. Provides `wslview` (open Windows apps), `wslpath` (path conversion), better Windows integration. |

**Why compilers for a Node.js project?**
Some npm packages have "native addons" written in C/C++ that must be compiled on your machine. Without `build-essential`, those `npm install` commands fail. Prisma and other packages may need this.

---

### 2.2 Install NVM

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
```

**Breaking this down:**

| Part | Meaning |
|------|---------|
| `curl` | Download tool |
| `-o-` | Output to stdout (terminal) instead of saving to file |
| `\|` | Pipe - takes output from left command, feeds as input to right command |
| `bash` | Runs the downloaded script in bash shell |

**What the script does:**
1. Clones nvm repository to `~/.nvm` (`~` means your home folder)
2. Adds these lines to your `~/.bashrc` (shell config file that runs on every terminal open):
```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

**Reload shell config** (so you don't have to close/reopen terminal):
```bash
source ~/.bashrc
```
`source` re-reads and executes the file. `.bashrc` normally only runs when you open a new terminal.

**Verify installation:**
```bash
nvm --version
```

---

### 2.3 Install Node 22 LTS

```bash
nvm install 22
```
Downloads and installs Node.js v22.x.x to `~/.nvm/versions/node/`

```bash
nvm alias default 22
```
Sets v22 as default for ALL new terminals. Without this, you'd need `nvm use` every time.

```bash
nvm use 22
```
Switches CURRENT terminal to use v22.

**How NVM works:** It manipulates your `$PATH` environment variable to point to different Node installations. Each version is completely separate.

**Verify:**
```bash
node --version   # Should show v22.x.x
npm --version
```

---

### 2.4 Install Claude Code CLI

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

**Flag meanings:**

| Flag | Purpose |
|------|---------|
| `-f` | Fail silently on HTTP errors (don't show error HTML pages) |
| `-s` | Silent mode (no progress bar) |
| `-S` | Show errors (used with -s to still show errors but hide progress) |
| `-L` | Follow redirects (if URL redirects, follow it automatically) |

**What it installs:** Claude binary to `~/.claude/bin/claude` and adds it to your PATH.

**Verify:**
```bash
claude --version
```

**First run:** Will prompt OAuth login to connect your Anthropic account. Select terminal style during setup.

---

### 2.5 Install Wrangler (Cloudflare CLI)

```bash
npm install -g wrangler
```

**Flag meaning:**
- `-g` = Global install. Puts the binary in a system-wide location (`~/.nvm/versions/node/v22.x.x/bin/`) so you can run `wrangler` from any directory.

Without `-g`, it would install to `./node_modules/` in current folder only.

```bash
wrangler login
```
Opens browser to authenticate with your Cloudflare account. Stores credentials locally for future deploys.

---

### 2.6 Set Chrome as Dev Browser (Optional but Recommended)

**Problem:** WSL uses your Windows default browser. If Firefox is your personal default but you want dev/OAuth logins to open in Chrome (where your dev passwords are saved).

**Solution:** Set the `BROWSER` environment variable for terminal/CLI tools:

```bash
echo 'export BROWSER="/mnt/c/Program Files/Google/Chrome/Application/chrome.exe"' >> ~/.bashrc
source ~/.bashrc
```

**What this does:**

| Part | Meaning |
|------|---------|
| `export BROWSER="..."` | Environment variable telling CLI tools which browser to use |
| `/mnt/c/Program Files/...` | Path to Windows Chrome via WSL mount |
| `>> ~/.bashrc` | Append to shell config (runs on every terminal open) |

**For VS Code**, add to settings (`Ctrl+,` → search "browser"):
```json
{
  "workbench.externalBrowser": "chrome"
}
```

**Test it:**
```bash
"$BROWSER" https://google.com
```
Should open Chrome.

---

### 2.7 Fix xdg-open to Use Chrome (Optional)

**Problem:** `xdg-open` ignores the `$BROWSER` variable and uses Windows default (Firefox).

**Solution:** Create a wrapper script that overrides system xdg-open:

```bash
sudo nano /usr/local/bin/xdg-open
```

Paste this content:
```bash
#!/bin/bash
"/mnt/c/Program Files/Google/Chrome/Application/chrome.exe" "$@"
```

**What `"$@"` does:** Passes all arguments (like the URL) to Chrome.

Save and exit: `Ctrl+O`, `Enter`, `Ctrl+X`

Make it executable:
```bash
sudo chmod +x /usr/local/bin/xdg-open
```

**Why this works:**
- `/usr/local/bin/` comes before `/usr/bin/` in `$PATH`
- Your custom script runs instead of the system `xdg-open`
- Any program calling `xdg-open` now opens Chrome

**Test:**
```bash
xdg-open https://google.com
```

**Result:**
- `$BROWSER` direct calls → Chrome
- `xdg-open` calls → Chrome
- Normal Windows browsing → Firefox (unchanged)

---

## Phase 3: Clone & Configure Project

### 3.1 Clone Repository

```bash
cd ~/projects
```
**`cd`** = Change Directory. `~` is shorthand for your home folder (`/home/your-username`).

```bash
git clone https://github.com/YOUR_USERNAME/budgeting-app-nuxt.git
```
Downloads the repository to a new folder named `budgeting-app-nuxt`.

```bash
cd budgeting-app-nuxt
```
Enter the project folder.

**Tip:** You can use `pwd` (Print Working Directory) anytime to see where you are:
```bash
pwd
# Output: /home/your-username/projects/budgeting-app-nuxt
```

---

### 3.2 Copy Sensitive Files from Windows

**Understanding WSL file access:**
- WSL mounts your Windows drives under `/mnt/`
- `C:\` becomes `/mnt/c/`
- `C:\Users\Bullzeye\Desktop` becomes `/mnt/c/Users/Bullzeye/Desktop`

**Option A: Using WSL mount (recommended)**
```bash
cp /mnt/c/Users/Bullzeye/Desktop/Development/budgeting-app-nuxt/.env.local ~/projects/budgeting-app-nuxt/
```

**`cp`** = Copy. Syntax: `cp SOURCE DESTINATION`

Copy Claude settings:
```bash
mkdir -p ~/projects/budgeting-app-nuxt/.claude
```
**`mkdir`** = Make Directory. **`-p`** flag = Create parent directories if they don't exist (won't error if folder exists).

```bash
cp /mnt/c/Users/Bullzeye/Desktop/Development/budgeting-app-nuxt/.claude/settings.local.json ~/projects/budgeting-app-nuxt/.claude/
```

**Option B: Manual copy**
Create `.env.local` with values from your Supabase/Cloudflare dashboards:
```env
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"
SUPABASE_URL="https://[PROJECT_REF].supabase.co"
SUPABASE_KEY="[YOUR_SUPABASE_ANON_KEY]"
CLOUDFLARE_API_TOKEN="[YOUR_CLOUDFLARE_API_TOKEN]"
```

### 3.3 Update .mcp.json for Linux
Replace Windows `cmd` commands with Linux `npx`:

**Current (Windows):**
```json
"command": "cmd",
"args": ["/c", "npx", "-y", "context7"]
```

**New (Linux):**
```json
"command": "npx",
"args": ["-y", "context7"]
```

Full updated `.mcp.json`:
```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "context7"]
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-playwright"]
    },
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    },
    "browsermcp": {
      "command": "npx",
      "args": ["-y", "@browsermcp/mcp@latest"]
    },
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=[PROJECT_REF]"
    },
    "cloudflare": {
      "type": "http",
      "url": "https://bindings.mcp.cloudflare.com/mcp"
    }
  }
}
```

### 3.4 Update package.json Cleanup Scripts

Replace Windows-only cleanup scripts with Linux versions.

**Current (Windows) - won't work in Linux:**
```json
"cleanup": "FOR /L %i IN (3000,1,3010) ...",
"cleanup:all": "taskkill /F /IM node.exe"
```

**New (Linux):**
```json
"cleanup": "for port in $(seq 3000 3010); do lsof -ti:$port | xargs -r kill -9 2>/dev/null || true; done",
"cleanup:all": "pkill -f 'node' || true"
```

**Understanding the Linux cleanup command:**

| Part | Meaning |
|------|---------|
| `for port in $(seq 3000 3010)` | Loop through ports 3000-3010 |
| `do ... done` | Execute commands for each port |
| `lsof -ti:$port` | List processes using this port. `-t` = terse (PID only), `-i:PORT` = filter by port |
| `\|` | Pipe output to next command |
| `xargs -r kill -9` | Take PIDs and kill them. `-r` = don't run if empty, `-9` = force kill signal |
| `2>/dev/null` | Redirect errors to nowhere (suppress "no process found" messages) |
| `\|\| true` | If command fails, return success anyway (prevents npm script from failing) |

**Understanding cleanup:all:**

| Part | Meaning |
|------|---------|
| `pkill -f 'node'` | Kill all processes matching "node". `-f` = match full command line |
| `\|\| true` | Don't fail if no processes found |

---

## Phase 4: Install Dependencies & Verify

### 4.1 Install Node Dependencies
```bash
npm install
```
Reads `package.json` and downloads all dependencies to `node_modules/` folder. This will be MUCH faster in native Linux filesystem vs `/mnt/c/`.

---

### 4.2 Generate Prisma Client
```bash
npx prisma generate
```
**`npx`** = Node Package Execute. Runs a package without installing it globally. If package exists in `node_modules`, uses that. Otherwise downloads temporarily.

This command reads your `prisma/schema.prisma` and generates the TypeScript client code to `node_modules/.prisma/client/`.

---

### 4.3 Test Development Server
```bash
npm run dev
```
Starts Nuxt dev server. This runs the `dev` script defined in `package.json`.

Open browser to `http://localhost:3000` to verify app works.

**To stop the server:** Press `Ctrl+C` in terminal.

---

### 4.4 Test Build
```bash
npm run build
```
Creates production build in `.output/` folder. Tests that your code compiles without errors.

---

### 4.5 Test Wrangler Preview
```bash
npx wrangler pages dev .output/public
```
Runs a local Cloudflare Pages emulator. Tests that your app works in the Cloudflare environment before deploying.

---

## Phase 5: Claude Code Setup in WSL

### 5.1 Initialize Claude Code
```bash
claude
```

First run will:
- Prompt OAuth login (opens browser)
- Select terminal style during setup
- Create `~/.claude/` directory

---

### 5.2 Set Up Global MCP Servers

**Why global?** You want MCP servers available across ALL projects, then enable/disable per-project as needed.

**Configuration file:** `~/.claude.json` (in your Linux home directory)

Create this file with all your MCP servers:
```bash
nano ~/.claude.json
```

Paste this content:
```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "context7"]
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-playwright"]
    },
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    },
    "browsermcp": {
      "command": "npx",
      "args": ["-y", "@browsermcp/mcp@latest"]
    },
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=[PROJECT_REF]"
    },
    "cloudflare": {
      "type": "http",
      "url": "https://bindings.mcp.cloudflare.com/mcp"
    }
  }
}
```

Save: `Ctrl+O`, then `Enter`, then `Ctrl+X` to exit nano.

**Understanding the scopes:**

| Scope | File | Purpose |
|-------|------|---------|
| **User (Global)** | `~/.claude.json` | Available in ALL projects |
| **Project** | `.mcp.json` in project root | Shared with team via git |
| **Local** | `~/.claude.json` with project path | Private overrides |

**How to enable/disable per project:**

Option 1: **Use project `.mcp.json`** - Only servers listed here will be active for that project (overrides global)

Option 2: **Use CLI commands:**
```bash
# Add server to user scope (global)
claude mcp add [name] --scope user

# List all configured servers
claude mcp list

# Remove a server
claude mcp remove [name]
```

Option 3: **Toggle in session** - Use the `@` menu in Claude Code to temporarily enable/disable servers (session-only, doesn't persist)

---

### 5.3 Per-Project MCP Control

For this budgeting project, you may want a project-level `.mcp.json` that specifies only the servers needed:

```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=[PROJECT_REF]"
    },
    "cloudflare": {
      "type": "http",
      "url": "https://bindings.mcp.cloudflare.com/mcp"
    }
  }
}
```

**Note:** If you keep project `.mcp.json` empty or don't include it, the global servers from `~/.claude.json` will be used.

---

### 5.4 Verify MCP Servers Work
Start Claude Code in your project:
```bash
cd ~/projects/budgeting-app-nuxt
claude
```

Test that Supabase and Cloudflare MCP servers connect properly by asking Claude to list tables or workers.

---

## Quick Reference: Common WSL Commands

| Windows | Linux (WSL) | What it does |
|---------|-------------|--------------|
| `dir` | `ls` | List files. Add `-la` for details + hidden files |
| `cd /d C:\path` | `cd /path` | Change directory |
| `cls` | `clear` | Clear terminal screen |
| `type file.txt` | `cat file.txt` | Print file contents |
| `copy` | `cp` | Copy files. Use `-r` for folders |
| `move` | `mv` | Move/rename files |
| `del` | `rm` | Delete files. Use `-r` for folders |
| `mkdir` | `mkdir -p` | Create directory. `-p` creates parents |
| `rmdir /s` | `rm -rf` | Delete folder + contents. **DANGEROUS** |
| `tasklist` | `ps aux` | List running processes |
| `taskkill /PID` | `kill -9 PID` | Kill process by ID |
| `findstr` | `grep` | Search text in files |
| `where` | `which` | Find location of a command |

### Bonus Linux Commands

| Command | Purpose |
|---------|---------|
| `pwd` | Print current directory (where am I?) |
| `ls -la` | List ALL files including hidden (dotfiles) |
| `cat ~/.bashrc` | View your shell config file |
| `nano file.txt` | Simple text editor (Ctrl+X to exit) |
| `chmod +x script.sh` | Make script executable |
| `./script.sh` | Run script in current directory |
| `history` | Show command history |
| `!!` | Repeat last command |
| `sudo !!` | Repeat last command as admin |
| `Ctrl+R` | Search command history (type to filter) |
| `Ctrl+C` | Cancel/stop current command |
| `Ctrl+L` | Clear screen (same as `clear`) |
| `Tab` | Auto-complete file/command names |
| `Tab Tab` | Show all possible completions |

---

## File System Notes

**Why native Linux is faster:**

| Location | Speed | Why |
|----------|-------|-----|
| `~/projects/` | 100-200 MB/s | Native ext4 filesystem, no translation layer |
| `/mnt/c/Users/...` | 20-50 MB/s | Every file operation crosses Windows↔Linux boundary |

**The performance difference is HUGE for:**
- `npm install` (thousands of small files)
- Git operations
- Build processes
- Hot reload during development

**Rules:**
- ✅ **Always develop in Linux filesystem** (`~/projects/`)
- ✅ Access Windows files only for one-time copies (configs, etc.)
- ❌ Don't run `npm install` or `git clone` on `/mnt/c/`

**Accessing files from the other side:**
- From WSL: Windows files at `/mnt/c/`, `/mnt/d/`, etc.
- From Windows: Linux files at `\\wsl$\Ubuntu\home\username\`

---

## Files Summary

### Must Copy Manually (git-ignored)
| File | Contains |
|------|----------|
| `.env.local` | Database URLs, Supabase/Cloudflare API keys |
| `.claude/settings.local.json` | Claude Code permissions & MCP settings |

### Must Update for Linux
| File | Change |
|------|--------|
| `.mcp.json` | Replace `cmd /c` with direct `npx` |
| `package.json` | Replace Windows cleanup scripts with Linux versions |

### Auto-Generated (no action needed)
- `node_modules/` - npm install
- `.nuxt/`, `.output/`, `dist/` - build
- `prisma/` client - prisma generate

---

## Optional: Windows Cleanup (Later)

Once WSL is working, you can optionally clean up Windows installations:

```powershell
# Uninstall global npm packages (Windows)
npm uninstall -g wrangler

# NVM for Windows can stay (useful for occasional Windows Node work)
# Or uninstall via Windows Settings > Apps
```

Keep Windows VS Code - it works with WSL via Remote-WSL extension.

---

## Verification Checklist

- [ ] VS Code opens via `code .` from WSL
- [ ] `nvm --version` shows nvm installed
- [ ] `node --version` shows v22.x.x
- [ ] `claude --version` shows Claude Code installed
- [ ] `npm run dev` starts dev server
- [ ] `npm run build` completes successfully
- [ ] App works at localhost:3000
- [ ] Prisma can connect to Supabase
- [ ] Wrangler can deploy to Cloudflare Pages

---

## Troubleshooting

### Port 3000 Conflict with Windows Node

WSL and Windows share the network stack. If localhost:3000 shows unexpected behavior, check for orphaned Windows Node processes:

```bash
# Check for Windows Node on port 3000
powershell.exe -Command "Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object OwningProcess | ForEach-Object { Get-Process -Id \$_.OwningProcess }"

# Kill all Windows Node processes
powershell.exe -Command "Stop-Process -Name node -Force"
```

### Clean Install After Copying from Windows

If you copied files from Windows instead of cloning:
```bash
rm -rf .nuxt .output node_modules package-lock.json
npm install
```
