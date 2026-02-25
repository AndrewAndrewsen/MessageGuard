import type { OpenClawPluginApi } from "./types.js";
declare const messageguardPlugin: {
    id: string;
    name: string;
    version: string;
    description: string;
    register(api: OpenClawPluginApi): void;
};
export default messageguardPlugin;
