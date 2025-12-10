# aks-job-runner

A small TypeScript job runner / in-memory queue with retries, delays and concurrency.

## Features

- Enqueue jobs with payloads

- Register per-job-type handlers with configurable concurrency

- Delayed jobs (`delayMs`)

- Retries with exponential backoff and jitter

- Events: `enqueue`, `start`, `success`, `retry`, `failed`, `started`, `stopped`

- No external dependencies for runtime (dev deps only)

## Quick start

```bash

# install dev deps

npm install

# compile

npm run build

# run tests

npm test

```

## Example

```ts

Copy code

import { Queue } from "aks-job-runner";

const q = new Queue();

q.register("sendEmail", async (payload) => {

  console.log("sending email to", payload.to);

}, { concurrency: 3 });

await q.enqueue("sendEmail", { to: "a@b.com" }, { maxAttempts: 3 });

q.on("success", (job) => console.log("job success", job.id));

q.on("failed", (job, err) => console.log("job failed", job.id, err));

q.start();

```
