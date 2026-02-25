# @andrewandersen/openclaw-messageguard

An [OpenClaw](https://openclaw.ai) plugin that automatically filters outgoing messages for secrets and sensitive data before they are delivered to any channel.

## What it does

MessageGuard intercepts every outgoing message via the `message_sending` hook and runs it through a Python-based pattern scanner. It can:

- **Block** messages containing hard secrets (AWS keys, private key PEM blocks, JWTs)
- **Mask** sensitive values (generic API keys, tokens, etc.) with redacted output
- **Warn** (log only, message still sent) for lower-confidence matches

Filtering is infrastructure-level — it applies regardless of which skill, tool, or agent sends the message.

## Requirements

- [OpenClaw](https://openclaw.ai) gateway running
- Python 3 available as `python3`
- [MessageGuard](https://github.com/AndrewAndrewsen/MessageGuard) filter script installed

## Installation

```bash
# 1. Install the plugin
openclaw plugins install @andrewandersen/openclaw-messageguard

# 2. Clone MessageGuard (if not already present)
git clone https://github.com/AndrewAndrewsen/MessageGuard.git \
  ~/.openclaw/workspace/skills/MessageGuard

# 3. Restart the gateway
openclaw gateway restart
```

## Configuration

In your OpenClaw config (`~/.openclaw/config.yaml`), under `plugins`:

```yaml
plugins:
  entries:
    messageguard:
      enabled: true
      config:
        enabled: true           # optional — defaults to true
        scriptPath: ~/.openclaw/workspace/skills/MessageGuard/scripts/filter_message.py
        configPath: ~/.openclaw/messageguard.yaml   # optional custom patterns
```

### Config options

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `enabled` | boolean | `true` | Disable to skip all filtering |
| `scriptPath` | string | `~/.openclaw/workspace/skills/MessageGuard/scripts/filter_message.py` | Path to the Python filter script |
| `configPath` | string | — | Optional path to a MessageGuard YAML/JSON config (custom patterns, mode, etc.) |

## Behaviour

| Outcome | Action |
|---------|--------|
| Script not found at startup | Logs a warning; messages pass through |
| Filter script error | Logs an error; message passes through (fail-open) |
| Message **blocked** | Delivery cancelled; warning logged |
| Message **masked** | Sanitised content delivered instead of original |
| **Warn**-only match | Warning logged; original content delivered |
| Clean message | Delivered unchanged |

## Customising patterns

See the [MessageGuard README](https://github.com/AndrewAndrewsen/MessageGuard#readme) for pattern configuration. Custom patterns and mode (`mask`/`block`/`warn`) are controlled by the MessageGuard config file, not the plugin config.

## License

MIT
