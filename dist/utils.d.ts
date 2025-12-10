export declare function nanoid(len?: number): string;
export declare function now(): number;
export declare function backoff(base: number, attempt: number, max?: number): number;
export declare function sleep(ms: number): Promise<void>;
