### MessageGuard: Outgoing Message Filter Skill

**Purpose**: MessageGuard filters outgoing text to prevent secret leaks and sensitive data exposure by using pattern-based detection and configurable actions (mask, block, or warn).

### Advanced Configuration Options:

- **`mode`**: Determines the global action for matched patterns. Options are:
  - `mask`: Replace sensitive data with the `mask_char`.
  - `block`: Prevent the message from being sent entirely.
  - `warn`: Allow the message but generate warnings.
- **`mask_char`**: The character(s) used to replace sensitive content when `mode` is set to `mask`.
- **`patterns`**: Define or customize regex-based detections. Built-ins exist for API keys, credentials, and more (e.g., AWS keys, JWTs). Add new patterns based on your requirements.
- **`logging`**: Enable detections to be logged as structured JSON for monitoring, debugging, or compliance needs. Configure the `log_path` for the output location.
- **Custom Patterns**: Users can define their custom patterns to override built-ins or extend functionalities. This supports regex and granular action control (mask, block, warn).

**Installation**
1. Clone the repository: `git clone git@github.com:AndrewAndrewsen/MessageGuard.git`.
2. Navigate to the directory. The skill is dependency-free, relying only on the Python standard library.

---

## OpenClaw Integration

MessageGuard does **not** automatically intercept outgoing messages — it must be wired in explicitly. There are three approaches, from lightest to most robust:

---

### Level 1: AGENTS.md Rule (immediate, no infra)

Add a standing instruction to `AGENTS.md` (or equivalent workspace rules file):

```markdown
## MessageGuard
Before calling the `message` tool or posting to any external service (Moltbook,
webhooks, email, etc.), run MessageGuard on the content:

  python3 ~/.openclaw/workspace/skills/MessageGuard/scripts/filter_message.py \
    --message "<content>" --channel "<channel>"

If the result is blocked (`"blocked": true`), do NOT send. Inform the user what
was detected and offer a sanitised alternative.
If masked, send `result.message` (the redacted version) instead of the original.
```

This relies on agent behaviour as the enforcement layer. It works immediately but
has no hard guarantee — a future session or sub-agent that doesn't load AGENTS.md
could bypass it.

---

### Level 2: Per-Skill Guard (skill-layer enforcement)

For any skill that sends external content, add a pre-send step. Example for a
shell-based skill workflow:

```bash
FILTERED=$(python3 ~/.openclaw/workspace/skills/MessageGuard/scripts/filter_message.py \
  --message "$MSG" --channel "$CHANNEL")
EXIT=$?
if [ $EXIT -eq 1 ]; then
  echo "BLOCKED: $(echo $FILTERED | jq -r '.detections[].name' | tr '\n' ',')"
  exit 1
fi
MSG=$(echo $FILTERED | jq -r '.message')
```

Each skill that sends outbound content (Moltbook posts, notifications, etc.)
should include this guard before its send step. See `references/integration.md`
for the full workflow.

---

### Level 3: OpenClaw Plugin (automatic, infrastructure-level)

The proper solution is a TypeScript OpenClaw plugin that intercepts outbound
delivery before any message leaves the system. This is the only approach that
enforces filtering regardless of which skill or agent is sending.

#### Plugin structure

```
openclaw-messageguard/
├── openclaw.plugin.json      # plugin manifest
├── index.ts                  # plugin entry point
├── filter.ts                 # calls filter_message.py via child_process
└── package.json
```

#### `openclaw.plugin.json`

```json
{
  "id": "messageguard",
  "name": "MessageGuard",
  "description": "Filters outgoing messages for secrets and sensitive data.",
  "version": "1.0.0",
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "enabled": { "type": "boolean" },
      "scriptPath": { "type": "string" },
      "configPath": { "type": "string" }
    }
  },
  "uiHints": {
    "scriptPath": { "label": "Path to filter_message.py", "placeholder": "~/.openclaw/workspace/skills/MessageGuard/scripts/filter_message.py" },
    "configPath": { "label": "Path to filter config (YAML/JSON)", "sensitive": false }
  }
}
```

#### `index.ts` (skeleton)

```ts
import { spawnSync } from "child_process";

export default function register(api) {
  const cfg = api.config?.plugins?.entries?.messageguard?.config ?? {};
  const scriptPath = cfg.scriptPath ?? "~/.openclaw/workspace/skills/MessageGuard/scripts/filter_message.py";

  api.registerHook(
    "message:before-send",
    async (ctx) => {
      if (!ctx.text) return;

      const result = spawnSync("python3", [
        scriptPath,
        "--message", ctx.text,
        "--channel", ctx.channel ?? "",
        ...(cfg.configPath ? ["--config", cfg.configPath] : []),
      ], { encoding: "utf8" });

      const parsed = JSON.parse(result.stdout);

      if (parsed.blocked) {
        const names = parsed.detections.map((d) => d.name).join(", ");
        ctx.abort(`⛔ MessageGuard blocked this message. Detected: ${names}`);
        return;
      }

      if (parsed.message !== ctx.text) {
        ctx.text = parsed.message; // use masked version
      }
    },
    {
      name: "messageguard.before-send",
      description: "Filter outgoing messages for secrets and sensitive data",
    }
  );
}
```

> **Note:** The `message:before-send` hook name is illustrative — verify the
> correct hook name against the current OpenClaw plugin API before building.
> Check `openclaw hooks list` on a running gateway for available hook names.

#### Install locally (dev)

```bash
cd openclaw-messageguard
npm install
openclaw plugins install -l .   # link without copying
openclaw gateway restart
```

---

### Publishing the Plugin

Once the plugin is working, publish it so others can install it with a single command.

#### 1. Publish to npm

```bash
# in your plugin directory
npm publish --access public
```

Package name recommendation: `@<your-scope>/openclaw-messageguard`
e.g. `@andrewandersen/openclaw-messageguard`

Others can then install it with:
```bash
openclaw plugins install @andrewandersen/openclaw-messageguard
```

#### 2. List in the OpenClaw community plugins page

Open a PR to the OpenClaw docs repo adding an entry to `docs/plugins/community.md`:

```markdown
- **MessageGuard** — Filters outgoing messages for API keys, credentials, PII, and other sensitive data
  npm: `@andrewandersen/openclaw-messageguard`
  repo: `https://github.com/AndrewAndrewsen/MessageGuard`
  install: `openclaw plugins install @andrewandersen/openclaw-messageguard`
```

Requirements for listing:
- Package published on npm
- Source on GitHub (public)
- Setup docs + issue tracker
- Active maintenance signal

---

## Which approach should I use?

| Situation | Recommendation |
|---|---|
| Quick protection now | Level 1 (AGENTS.md rule) + Level 2 for key skills |
| Per-skill control | Level 2 |
| Full enforcement, no exceptions | Level 3 (plugin) |
| Want to share with the community | Build Level 3, publish to npm |
