import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
function resolvePath(p) {
    return p.startsWith("~") ? p.replace("~", homedir()) : p;
}
export function runFilter(message, opts) {
    const resolvedScript = resolvePath(opts.scriptPath);
    if (!existsSync(resolvedScript)) {
        return null; // script not found — caller should warn and pass through
    }
    const args = ["--message", message];
    if (opts.channel)
        args.push("--channel", opts.channel);
    if (opts.configPath)
        args.push("--config", resolvePath(opts.configPath));
    const proc = spawnSync("python3", [resolvedScript, ...args], {
        encoding: "utf8",
        timeout: 5000,
    });
    if (proc.error) {
        throw new Error(`MessageGuard: failed to spawn python3: ${proc.error.message}`);
    }
    if (proc.status === 2) {
        throw new Error(`MessageGuard: script error: ${proc.stderr}`);
    }
    const stdout = proc.stdout?.trim();
    if (!stdout) {
        throw new Error("MessageGuard: empty output from filter script");
    }
    return JSON.parse(stdout);
}
