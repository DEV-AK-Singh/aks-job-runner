export type JobStatus = "pending" | "running" | "failed" | "completed" | "scheduled";

export interface Job<T = any> {
  id: string;
  name: string;
  payload: T;
  attempts: number;
  maxAttempts: number;
  runAt: number; // epoch ms
  createdAt: number;
  updatedAt?: number;
}

export interface JobOptions {
  delayMs?: number;
  maxAttempts?: number;
  backoffMs?: number; // base backoff in ms
  priority?: number;
}

export type JobHandler<T = any> = (payload: T, ctx: JobContext<T>) => Promise<void> | void;

export interface JobContext<T = any> {
  job: Job<T>;
  attempt: number;
  retry: (delayMs?: number) => Promise<void>;
}

export interface HandlerRegistration<T = any> {
  handler: JobHandler<T>;
  concurrency: number;
  backoffMs: number;
}

export interface PersistenceAdapter {
  add(job: Job): Promise<void>;
  update(job: Job): Promise<void>;
  remove(jobId: string): Promise<void>;
  list(): Promise<Job[]>;
}
