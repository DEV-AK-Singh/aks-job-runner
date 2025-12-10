import { EventEmitter } from "events";
import type {
  Job,
  JobOptions,
  JobHandler,
  HandlerRegistration,
  PersistenceAdapter
} from "./types.js";
import { nanoid, now, backoff } from "./utils.js";
import { Worker } from "./worker.js";

type InternalJob = Job & { priority?: number };

export class InMemoryAdapter implements PersistenceAdapter {
  private jobs: Job[] = [];
  async add(job: Job) {
    this.jobs.push(job);
  }
  async update(job: Job) {
    const idx = this.jobs.findIndex((j) => j.id === job.id);
    if (idx >= 0) this.jobs[idx] = job;
  }
  async remove(jobId: string) {
    this.jobs = this.jobs.filter((j) => j.id !== jobId);
  }
  async list() {
    return [...this.jobs];
  }
}

export class Queue extends EventEmitter {
  private handlers = new Map<string, HandlerRegistration>();
  private adapter: PersistenceAdapter;
  private jobs: InternalJob[] = [];
  private runningCount = new Map<string, number>();
  private timer: NodeJS.Timeout | null = null;
  private pollingInterval = 200;
  private stopped = true;

  constructor(adapter?: PersistenceAdapter) {
    super();
    this.adapter = adapter ?? new InMemoryAdapter();
  }

  register<T = any>(name: string, handler: JobHandler<T>, opts?: { concurrency?: number; backoffMs?: number }) {
    const reg: HandlerRegistration = {
      handler,
      concurrency: opts?.concurrency ?? 1,
      backoffMs: opts?.backoffMs ?? 1000
    };
    this.handlers.set(name, reg);
    this.runningCount.set(name, 0);
  }

  async enqueue<T = any>(name: string, payload: T, opts: JobOptions = {}): Promise<Job<T>> {
    const id = nanoid();
    const base = now();
    const runAt = base + (opts.delayMs ?? 0);
    const job: Job<T> = {
      id,
      name,
      payload,
      attempts: 0,
      maxAttempts: opts.maxAttempts ?? 1,
      runAt,
      createdAt: base,
      updatedAt: base
    };
    const internal: InternalJob = { ...job, priority: opts.priority ?? 0 };
    this.jobs.push(internal);
    await this.adapter.add(job);
    this.emit("enqueue", job);
    return job;
  }

  private pickReadyJobs(): InternalJob[] {
    const nowTime = now();
    // ready jobs = runAt <= now
    const ready = this.jobs.filter((j) => j.runAt <= nowTime);
    // sort by priority (desc) then createdAt (asc)
    ready.sort((a, b) => {
      if ((b.priority ?? 0) !== (a.priority ?? 0)) return (b.priority ?? 0) - (a.priority ?? 0);
      return (a.createdAt ?? 0) - (b.createdAt ?? 0);
    });
    return ready;
  }

  private removeJob(jobId: string) {
    this.jobs = this.jobs.filter((j) => j.id !== jobId);
  }

  private async dispatchJob(job: InternalJob) {
    const reg = this.handlers.get(job.name);
    if (!reg) {
      // no handler: fail job
      this.emit("failed", job, new Error(`No handler registered for ${job.name}`));
      this.removeJob(job.id);
      await this.adapter.remove(job.id);
      return;
    }

    const running = this.runningCount.get(job.name) ?? 0;
    if (running >= reg.concurrency) return; // can't dispatch now

    // occupy a slot
    this.runningCount.set(job.name, running + 1);
    job.attempts++;
    job.updatedAt = now();
    this.emit("start", job);

    const retryFn = async (delayMs = 0) => {
      // schedule retry
      if (job.attempts >= (job.maxAttempts ?? 1)) return;
      job.runAt = now() + delayMs;
      job.updatedAt = now();
      await this.adapter.update(job);
      this.emit("retryScheduled", job);
    };

    const onComplete = async (success: boolean, err?: any) => {
      if (success) {
        this.emit("success", job);
        this.removeJob(job.id);
        await this.adapter.remove(job.id);
      } else {
        if (job.attempts < (job.maxAttempts ?? 1)) {
          const delay = backoff(reg.backoffMs, job.attempts);
          job.runAt = now() + delay;
          await this.adapter.update(job);
          this.emit("retry", job, err);
        } else {
          this.emit("failed", job, err);
          this.removeJob(job.id);
          await this.adapter.remove(job.id);
        }
      }
      // free slot
      this.runningCount.set(job.name, (this.runningCount.get(job.name) ?? 1) - 1);
    };

    const worker = new Worker(job, reg.handler as any, job.attempts, retryFn, onComplete);
    worker.run().catch(async (err) => {
      // should be handled inside onComplete, but ensure catching
      await onComplete(false, err);
    });
  }

  private tick = async () => {
    if (this.stopped) return;
    const ready = this.pickReadyJobs();

    for (const job of ready) {
      const reg = this.handlers.get(job.name);
      if (!reg) {
        // fail quickly
        this.emit("failed", job, new Error(`No handler for ${job.name}`));
        this.removeJob(job.id);
        await this.adapter.remove(job.id);
        continue;
      }
      const running = this.runningCount.get(job.name) ?? 0;
      if (running < reg.concurrency) {
        // dispatch
        await this.dispatchJob(job);
      }
    }
  };

  start(intervalMs = 200) {
    if (!this.stopped) return;
    this.stopped = false;
    this.pollingInterval = intervalMs;
    this.timer = setInterval(this.tick, this.pollingInterval);
    this.emit("started");
  }

  stop({ force = false } = {}): Promise<void> {
    return new Promise((resolve) => {
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
      this.stopped = true;
      this.emit("stopped");
      if (force) {
        // immediate resolve
        resolve();
      } else {
        // wait for running jobs to finish (simple check)
        const check = () => {
          const anyRunning = Array.from(this.runningCount.values()).some((n) => n > 0);
          if (!anyRunning) resolve();
          else setTimeout(check, 100);
        };
        check();
      }
    });
  }

  // helper to inspect jobs (mainly for tests)
  listJobs() {
    return [...this.jobs];
  }
}
