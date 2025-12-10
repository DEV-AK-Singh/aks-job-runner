import { EventEmitter } from "events";
import type { Job, JobOptions, JobHandler, PersistenceAdapter } from "./types.js";
type InternalJob = Job & {
    priority?: number;
};
export declare class InMemoryAdapter implements PersistenceAdapter {
    private jobs;
    add(job: Job): Promise<void>;
    update(job: Job): Promise<void>;
    remove(jobId: string): Promise<void>;
    list(): Promise<Job<any>[]>;
}
export declare class Queue extends EventEmitter {
    private handlers;
    private adapter;
    private jobs;
    private runningCount;
    private timer;
    private pollingInterval;
    private stopped;
    constructor(adapter?: PersistenceAdapter);
    register<T = any>(name: string, handler: JobHandler<T>, opts?: {
        concurrency?: number;
        backoffMs?: number;
    }): void;
    enqueue<T = any>(name: string, payload: T, opts?: JobOptions): Promise<Job<T>>;
    private pickReadyJobs;
    private removeJob;
    private dispatchJob;
    private tick;
    start(intervalMs?: number): void;
    stop({ force }?: {
        force?: boolean | undefined;
    }): Promise<void>;
    listJobs(): InternalJob[];
}
export {};
