---
name: claude-settings-audit
description: Analyze a repository to generate recommended Claude Code settings.json permissions. Use when setting up a new project, auditing existing settings, or determining which bash commands to allow. Detects tech stack, build tools, and monorepo structure.
---

# Claude Settings Audit

Analyze this repository and generate recommended Claude Code `settings.json` permissions.

## Phase 1: Detect Tech Stack

Run these commands to detect the repository structure:

```bash
ls -la
find . -maxdepth 2 \( -name "*.toml" -o -name "*.json" -o -name "*.lock" -o -name "*.yaml" -o -name "*.yml" -o -name "Makefile" -o -name "Dockerfile" -o -name "*.tf" \) 2>/dev/null | head -50
```

Check for these indicator files:

| Category     | Files to Check                                                                        |
| ------------ | ------------------------------------------------------------------------------------- |
| **Python**   | `pyproject.toml`, `setup.py`, `requirements.txt`, `Pipfile`, `poetry.lock`, `uv.lock` |
| **Node.js**  | `package.json`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`                    |
| **Go**       | `go.mod`, `go.sum`                                                                    |
| **Rust**     | `Cargo.toml`, `Cargo.lock`                                                            |
| **Ruby**     | `Gemfile`, `Gemfile.lock`                                                             |
| **Java**     | `pom.xml`, `build.gradle`, `build.gradle.kts`                                         |
| **Build**    | `Makefile`, `Dockerfile`, `docker-compose.yml`                                        |
| **Infra**    | `*.tf` files, `kubernetes/`, `helm/`                                                  |
| **Monorepo** | `lerna.json`, `nx.json`, `turbo.json`, `pnpm-workspace.yaml`                          |

## Phase 2: Detect Services

Check for service integrations:

| Service    | Detection                                                          |
| ---------- | ------------------------------------------------------------------ |
| **Linear** | Linear config files, `.linear/` directory, `.mcp.json` with linear |

Read dependency files to identify frameworks:

- `package.json` → check `dependencies` and `devDependencies`
- `pyproject.toml` → check `[project.dependencies]` or `[tool.poetry.dependencies]`
- `Gemfile` → check gem names
- `Cargo.toml` → check `[dependencies]`

## Phase 3: Check Existing Settings

```bash
cat .claude/settings.json 2>/dev/null || echo "No existing settings"
```

## Phase 4: Generate Recommendations

Build the allow list by combining:

### Baseline Commands (Always Include)

```json
[
  "WebFetch",
  "WebSearch",

  "Bash(ls:*)",
  "Bash(pwd:*)",
  "Bash(find:*)",
  "Bash(file:*)",
  "Bash(stat:*)",
  "Bash(wc:*)",
  "Bash(head:*)",
  "Bash(tail:*)",
  "Bash(cat:*)",
  "Bash(tree:*)",
  "Bash(grep:*)",
  "Bash(echo:*)",
  "Bash(cd:*)",
  "Bash(cp:*)",
  "Bash(sort:*)",
  "Bash(paste:*)",
  "Bash(bc)",
  "Bash(xargs:*)",

  "Bash(git status:*)",
  "Bash(git log:*)",
  "Bash(git diff:*)",
  "Bash(git show:*)",
  "Bash(git branch:*)",
  "Bash(git remote:*)",
  "Bash(git tag:*)",
  "Bash(git stash list:*)",
  "Bash(git rev-parse:*)",

  "Bash(gh pr view:*)",
  "Bash(gh pr list:*)",
  "Bash(gh pr checks:*)",
  "Bash(gh pr diff:*)",
  "Bash(gh issue view:*)",
  "Bash(gh issue list:*)",
  "Bash(gh run view:*)",
  "Bash(gh run list:*)",
  "Bash(gh run logs:*)",
  "Bash(gh repo view:*)",
  "Bash(gh api:*)"
]
```

### Stack-Specific Commands

Include commands for tools detected in the project.

#### Python (if any Python files or config detected)

| If Detected                        | Add These Commands                      |
| ---------------------------------- | --------------------------------------- |
| Any Python                         | `python --version`, `python3 --version` |
| `poetry.lock`                      | `poetry show`, `poetry env info`        |
| `uv.lock`                          | `uv pip list`, `uv tree`                |
| `Pipfile.lock`                     | `pipenv graph`                          |
| `requirements.txt` (no other lock) | `pip list`, `pip show`, `pip freeze`    |

#### Node.js (if package.json detected)

| If Detected                  | Add These Commands |
| ---------------------------- | ------------------ |
| Any Node.js                  | `node --version`   |
| `pnpm-lock.yaml`             | `pnpm:*`           |
| `yarn.lock`                  | `yarn:*`, `nvm:*`  |
| `package-lock.json`          | `npm:*`            |
| TypeScript (`tsconfig.json`) | `tsc --version`    |

#### Other Languages

| If Detected    | Add These Commands                                                   |
| -------------- | -------------------------------------------------------------------- |
| `go.mod`       | `go version`, `go list`, `go mod graph`, `go env`                    |
| `Cargo.toml`   | `rustc --version`, `cargo --version`, `cargo tree`, `cargo metadata` |
| `Gemfile`      | `ruby --version`, `bundle list`, `bundle show`                       |
| `pom.xml`      | `java --version`, `mvn --version`, `mvn dependency:tree`             |
| `build.gradle` | `java --version`, `gradle --version`, `gradle dependencies`          |

#### Build Tools

| If Detected          | Add These Commands                                                   |
| -------------------- | -------------------------------------------------------------------- |
| `Dockerfile`         | `docker --version`, `docker ps`, `docker images`                     |
| `docker-compose.yml` | `docker-compose ps`, `docker-compose config`                         |
| `*.tf` files         | `terraform --version`, `terraform providers`, `terraform state list` |
| `Makefile`           | `make --version`, `make -n`                                          |
| `turbo.json`         | `turbo --version`                                                    |

### MCP Server Suggestions

MCP servers are configured in `.mcp.json` (not `settings.json`). Check for existing config:

```bash
cat .mcp.json 2>/dev/null || echo "No existing .mcp.json"
```

#### Linear MCP (if Linear usage detected)

Add to `.mcp.json`:

```json
{
  "mcpServers": {
    "linear": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.linear.app/mcp"]
    }
  }
}
```

**Note**: Never suggest GitHub MCP. Always use `gh` CLI commands for GitHub.

## Output Format

Present your findings as:

1. **Summary Table** - What was detected
2. **Recommended settings.json** - Complete JSON ready to copy
3. **MCP Suggestions** - If applicable
4. **Merge Instructions** - If existing settings found

Example output structure:

```markdown
## Detected Tech Stack

| Category        | Found          |
| --------------- | -------------- |
| Languages       | Python 3.x     |
| Package Manager | poetry         |
| Frameworks      | Django, Celery |
| Services        | Linear         |
| Build Tools     | Docker, Make   |

## Recommended .claude/settings.json

{
"permissions": {
"allow": [
...
],
"deny": []
},
"enableAllProjectMcpServers": true
}

## Recommended .mcp.json (if applicable)

If you use Linear, add the MCP config to `.mcp.json`...
```

## Guidelines

### What to Include

- Standard system commands (ls, cat, find, grep, etc.)
- Git and GitHub CLI commands
- Package manager commands for detected tools
- The `:*` suffix allows any arguments to the base command

### What to Avoid

- **Absolute paths** - Never include user-specific paths like `/home/user/scripts/foo`
- **Custom scripts** - Avoid project scripts that may have unintended side effects
- **Alternative package managers** - If the project uses pnpm, don't include npm/yarn

### Package Manager Rules

Include the package manager actually used by the project:

| If Detected         | Include         |
| ------------------- | --------------- |
| `pnpm-lock.yaml`    | pnpm commands   |
| `yarn.lock`         | yarn commands   |
| `package-lock.json` | npm commands    |
| `poetry.lock`       | poetry commands |
| `uv.lock`           | uv commands     |
| `Pipfile.lock`      | pipenv commands |

If multiple lock files exist, include commands for each detected manager.
