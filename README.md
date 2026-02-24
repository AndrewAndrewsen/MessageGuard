# MessageGuard

MessageGuard is an OpenClaw skill designed to filter outgoing messages, preventing secret leaks and protecting sensitive data. It supports detecting and handling private keys, API tokens, bearer tokens, and other confidential entities.

## Key Features
- **Detection**: Uses regex and entropy-based methods to identify sensitive information.
- **Modes**: Choose between `mask`, `block`, or `warn` behavior.
- **Patterns**: 20 built-in patterns, customizable for unique cases.
- **Configuration**: YAML config for global defaults, custom exceptions, and audit logging.

## Getting Started

1. **Clone the Repository:**
```bash
git clone git@github.com:AndrewAndrewsen/MessageGuard.git
```
2. **Navigate to the Directory:**
```bash
cd MessageGuard
```
3. **Install Dependencies:**
- The skill uses only Python's standard library. No external dependencies are required.

4. **Configure (Optional):**
- Edit `~/.openclaw/outgoing-filter-config.yaml` for advanced usage.

## How to Use
- Run the filter pipeline as part of OpenClaw outgoing message workflows.
- Refer to `SKILL.md` in the repository for detailed usage instructions and integration examples.

## Contribute
- Found this useful? Consider starring the repository!
- Support development: [Buy me a coffee](https://ko-fi.com/andrewandrewsen).
