export type FilterResult = {
    blocked: boolean;
    message: string;
    detections: Array<{
        name: string;
        action: string;
        snippet?: string;
    }>;
    warnings: string[];
};
export type FilterOptions = {
    scriptPath: string;
    channel?: string;
    configPath?: string;
};
export declare function runFilter(message: string, opts: FilterOptions): FilterResult | null;
