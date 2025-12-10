import type { Job, JobHandler, JobContext } from "./types.js";

export class Worker<T = any> {
  private handler: JobHandler<T>;
  private job: Job<T>;
  private attempt: number;
  private onComplete: (success: boolean, err?: any) => void;
  private retryFn: (delayMs?: number) => Promise<void>;

  constructor(
    job: Job<T>,
    handler: JobHandler<T>,
    attempt: number,
    retryFn: (delayMs?: number) => Promise<void>,
    onComplete: (success: boolean, err?: any) => void
  ) {
    this.job = job;
    this.handler = handler;
    this.attempt = attempt;
    this.onComplete = onComplete;
    this.retryFn = retryFn;
  }

  async run() {
    try {
      const ctx: JobContext<T> = {
        job: this.job,
        attempt: this.attempt,
        retry: this.retryFn
      };

      await Promise.resolve(this.handler(this.job.payload as T, ctx));
      this.onComplete(true);
    } catch (err) {
      this.onComplete(false, err);
    }
  }
}
