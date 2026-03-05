# 🧵 Custom Thread Pool

A lightweight, zero-dependency thread pool implementation for Node.js using the built-in `worker_threads` module. Offload CPU-intensive tasks to parallel worker threads while keeping the main event loop fully responsive.

---

## 📐 System Architecture

![Thread Pool Architecture](./thread_pool_architecture.svg)

The diagram above shows the full lifecycle of a task — from `addTask()` on the main thread, through the FIFO task queue, to a spawned Worker thread running `worker.js`, and back as a resolved or rejected Promise.

---

## 📁 Project Structure

```
├── threadPool.js   # ThreadPool class — queue, dispatch, lifecycle management
└── worker.js       # Worker script — deserialises and executes tasks via eval()
```

---

## 🚀 Quick Start

No installation needed — uses only Node.js built-ins.

```js
const ThreadPool = require('./threadPool');

const pool = new ThreadPool(4); // max 4 concurrent worker threads

const result = await pool.addTask((x, y) => x + y, 10, 20);
console.log(result); // 30
```

---

## ⚙️ API

### `new ThreadPool(maxThreads?)`

Creates a new thread pool.

| Parameter    | Type     | Default              | Description                          |
|-------------|----------|----------------------|--------------------------------------|
| `maxThreads` | `number` | `os.cpus().length`   | Maximum number of concurrent workers |

---

### `pool.addTask(fn, ...args)`

Submits a task to the pool. Returns a `Promise` that resolves with the function's return value or rejects on error.

```js
pool.addTask((text) => text.toUpperCase(), 'hello world')
  .then(console.log)  // "HELLO WORLD"
  .catch(console.error);
```

> **Important:** The function is serialised via `fn.toString()` and reconstructed inside the worker using `eval()`. This means:
> - ❌ No closures — the function cannot reference variables from its outer scope
> - ❌ No imported modules — `require()` calls inside the task will fail
> - ✅ Self-contained functions with only their arguments work perfectly

---

### `pool.getStats()`

Returns a snapshot of the pool's current state.

```js
console.log(pool.getStats());
// { activeThreads: 2, queuedTasks: 1, maxThreads: 4 }
```

---

## 🔬 How It Works

### 1. Task Submission — `addTask()`
Each call to `addTask()` creates a task object containing the function stringified via `fn.toString()`, the arguments, and the Promise's `resolve`/`reject` callbacks. The task is pushed onto the internal FIFO queue (`this.taskQueue`), then `_processQueue()` is called.

### 2. Queue Processing — `_processQueue()`
A `while` loop checks whether `activeThreads < maxThreads`. For every available slot, it shifts the next task from the queue and calls `_executeTask()`. Tasks beyond the concurrency limit remain in the queue until a worker finishes.

### 3. Worker Execution — `_executeTask()`
A brand-new `Worker` thread is spawned for every task by calling `new Worker(path.resolve(__dirname, 'worker.js'))`. The task payload `{ id, fn, args }` is sent to it via `worker.postMessage()`.

- On success: `worker.on('message')` fires → `task.resolve(result)` → `worker.terminate()`
- On error: `worker.on('error')` fires → `task.reject(error)` → `worker.terminate()`

After each completion, `activeThreads` is decremented and `_processQueue()` is called again to pick up the next waiting task.

### 4. Inside the Worker — `worker.js`
The worker listens for a message, reconstructs the function string back into a callable using `eval(`(${task.fn})`)`, invokes it with `fn(...task.args)`, and sends the result back via `parentPort.postMessage()`. Any exception is caught and forwarded as an error payload.

---

## 📋 Example

```js
const pool = new ThreadPool(4);

const tasks = [
  pool.addTask((x, y) => {
    let sum = 0;
    for (let i = 0; i < 1_000_000; i++) sum += i;
    return `Task 1 result: ${x + y}, sum: ${sum}`;
  }, 5, 10),

  pool.addTask((text) => `Processed: ${text.toUpperCase()}`, 'hello world'),

  pool.addTask((num) => {
    let fact = 1;
    for (let i = 1; i <= num; i++) fact *= i;
    return `Factorial of ${num} is ${fact}`;
  }, 10),
];

const results = await Promise.all(tasks);
console.log('All results:', results);
// [
//   'Task 1 result: 15, sum: 499999500000',
//   'Processed: HELLO WORLD',
//   'Factorial of 10 is 3628800'
// ]

console.log('Pool stats:', pool.getStats());
// { activeThreads: 0, queuedTasks: 0, maxThreads: 4 }
```

---

## ⚠️ Limitations

| Limitation | Detail |
|-----------|--------|
| **No worker reuse** | A new `Worker` is spawned for every task and terminated after completion. For high-frequency task bursts this adds per-spawn overhead. |
| **No closures** | Functions are serialised to strings. Outer-scope variables are not captured. |
| **CPU-bound only** | `worker_threads` excels at parallel computation. For I/O-bound work, Node's async event loop is already more efficient. |
| **eval() usage** | Task functions are reconstructed with `eval()` inside the worker. Avoid passing untrusted code. |

---

## 📄 License

MIT
