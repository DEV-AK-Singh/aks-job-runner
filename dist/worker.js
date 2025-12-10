export class Worker {
    constructor(job, handler, attempt, retryFn, onComplete) {
        this.job = job;
        this.handler = handler;
        this.attempt = attempt;
        this.onComplete = onComplete;
        this.retryFn = retryFn;
    }
    async run() {
        try {
            const ctx = {
                job: this.job,
                attempt: this.attempt,
                retry: this.retryFn
            };
            await Promise.resolve(this.handler(this.job.payload, ctx));
            this.onComplete(true);
        }
        catch (err) {
            this.onComplete(false, err);
        }
    }
}
//# sourceMappingURL=worker.js.map