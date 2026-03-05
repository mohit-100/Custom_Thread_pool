const os = require("os");
const path = require("path");
const { Worker } = require("worker_threads");

class ThreadPool {
    constructor(maxThreads = os.cpus().length) {
        this.maxThreads = maxThreads;
        this.taskQueue = [];
        this.activeThreads = 0;
    }

    addTask(fn, ...args) {
        return new Promise((resolve, reject) => {
            const task = {
                id: Date.now() + Math.random(),
                fn: fn.toString(),
                args,
                resolve,
                reject
            };

            this.taskQueue.push(task);
            this._processQueue();
        });
    }

    _processQueue() {
        while (this.activeThreads < this.maxThreads && this.taskQueue.length > 0) {
            const task = this.taskQueue.shift();
            this._executeTask(task);
        }
    }

    _executeTask(task) {
        this.activeThreads++;

        const worker = new Worker(path.resolve(__dirname, "worker.js"));

        worker.on("message", (result) => {
            this.activeThreads--;

            if (result.error) {
                task.reject(new Error(result.error));
            } else {
                task.resolve(result.result);
            }

            worker.terminate();
            this._processQueue();
        });

        worker.on("error", (error) => {
            this.activeThreads--;
            task.reject(error);

            worker.terminate();
            this._processQueue();
        });

        worker.postMessage({
            id: task.id,
            fn: task.fn,
            args: task.args
        });
    }

    getStats() {
        return {
            activeThreads: this.activeThreads,
            queuedTasks: this.taskQueue.length,
            maxThreads: this.maxThreads
        };
    }
}

// Example usage
async function example() {
    const pool = new ThreadPool(4);

    const tasks = [
        pool.addTask((x, y) => {
            let sum = 0;
            for (let i = 0; i < 1000000; i++) {
                sum += i;
            }
            return `Task 1 result: ${x + y}, sum: ${sum}`;
        }, 5, 10),

        pool.addTask((text) => {
            return `Processed: ${text.toUpperCase()}`;
        }, "hello world"),

        pool.addTask((num) => {
            let fact = 1;
            for (let i = 1; i <= num; i++) {
                fact *= i;
            }
            return `Factorial of ${num} is ${fact}`;
        }, 10)
    ];

    const results = await Promise.all(tasks);

    console.log("All results:", results);
    console.log("Pool stats:", pool.getStats());
}

example().catch(console.error);
