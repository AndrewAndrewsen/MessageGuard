import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { runFilter } from "./filter.js";
const DEFAULT_SCRIPT_PATH = "~/.openclaw/workspace/skills/MessageGuard/scripts/filter_message.py";
function resolveHome(p) {
    return p.startsWith("~") ? p.replace("~", homedir()) : p;
}
function filterContent(content, resolvedScript, channel, configPath, api) {
    let result;
    try {
        result = runFilter(content, {
            scriptPath: resolvedScript,
            channel: channel,
            configPath,
        });
    }
    catch (err) {
        api.logger.error(`MessageGuard: filter error — ${err instanceof Error ? err.message : String(err)}`);
        return { action: "pass" };
    }
    if (result === null)
        return { action: "pass" };
    if (result.blocked) {
        const names = result.detections.map((d) => d.name).join(", ");
        api.logger.warn(`MessageGuard: BLOCKED — Detected: ${names}`);
        return { action: "cancel" };
    }
    if (result.warnings.length > 0) {
        api.logger.warn(`MessageGuard: warnings: ${result.warnings.join("; ")}`);
    }
    if (result.message !== content) {
        return { action: "replace", message: result.message };
    }
    return { action: "pass" };
}
const messageguardPlugin = {
    id: "messageguard",
    name: "MessageGuard",
    version: "1.1.0",
    description: "Filters outgoing messages for API keys, credentials, PII, and other sensitive data.",
    register(api) {
        const cfg = (api.pluginConfig ?? {});
        if (cfg.enabled === false) {
            api.logger.info("MessageGuard: disabled by config, skipping hook registration.");
            return;
        }
        const scriptPath = cfg.scriptPath ?? DEFAULT_SCRIPT_PATH;
        const configPath = cfg.configPath;
        const resolvedScript = resolveHome(scriptPath);
        if (!existsSync(resolvedScript)) {
            api.logger.warn(`MessageGuard: filter script not found at "${resolvedScript}". ` +
                `Messages will pass through unfiltered until the script is available.`);
        }
        // Hook 1: before_tool_call — intercept message tool sends
        api.on("before_tool_call", async (event) => {
            if (event.toolName !== "message")
                return;
            const params = event.params ?? {};
            if (params.action !== "send" && params.action !== "broadcast")
                return;
            const content = String(params.message ?? params.text ?? params.content ?? "");
            if (!content)
                return;
            const result = filterContent(content, resolvedScript, String(params.channel ?? ""), configPath, api);
            if (result.action === "cancel") {
                return { block: true };
            }
            if (result.action === "replace" && result.message) {
                return {
                    params: {
                        ...params,
                        message: result.message,
                        text: result.message,
                        content: result.message,
                        caption: result.message,
                    },
                };
            }
        }, { priority: 100 });
        // Hook 2: message_sending — intercept agent replies (when wired up)
        api.on("message_sending", async (event, ctx) => {
            if (!event.content)
                return;
            const result = filterContent(event.content, resolvedScript, ctx.channelId, configPath, api);
            if (result.action === "cancel") {
                return { cancel: true };
            }
            if (result.action === "replace" && result.message) {
                return { content: result.message };
            }
        }, { priority: 100 });
        api.logger.info(`MessageGuard: registered before_tool_call + message_sending hooks (script: ${resolvedScript})`);
    },
};
export default messageguardPlugin;
