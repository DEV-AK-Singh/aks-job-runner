import type { Job, JobHandler } from "./types.js";
export declare class Worker<T = any> {
    private handler;
    private job;
    private attempt;
    private onComplete;
    private retryFn;
    constructor(job: Job<T>, handler: JobHandler<T>, attempt: number, retryFn: (delayMs?: number) => Promise<void>, onComplete: (success: boolean, err?: any) => void);
    run(): Promise<void>;
}
