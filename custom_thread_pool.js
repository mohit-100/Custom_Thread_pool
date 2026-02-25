// 1️⃣ What a “thread pool” means in JS

// A thread pool =

// Fixed number of workers

// Task queue

// Workers pick tasks → execute → return result

// Reuse workers instead of creating new ones every time

//  const os = require("os")
//  const {worker,parentPort} = require("worker_threads");
 

// class Thread_pool {

    
//      Pool_Size;
//       Task_Queue = [];

//     constructor(Task){

//         this.Pool_Size = os.cpus().length;
//        this.Task_Queue = Task;
//     }

//       Execution_Task(){

//         for(let i = 0 ; i < this.Task_Queue.length;i++){
//               const Take_Task = this.Task_Queue.pop();
//               if(i < this.Pool_Size){
//                   parentPort.postMessage(Take_Task);
//               }
//         }
//       }

// }

// const Task = new worker();

// const Thread = new Thread_pool()

// console.log(Task);

const os = require("os");
const { Worker } = require("worker_threads");
const path = require("path");

class ThreadPool {
    constructor() {
        this.poolSize = os.cpus().length;
        this.taskQueue = [];
        this.workers = [];
        this.idleWorkers = [];

        for (let i = 0; i < this.poolSize; i++) {
            // const worker = new Worker("./worker.js");
            const worker = new Worker(path.resolve(__dirname, "worker.js"));

            worker.on("message", (result) => {
                console.log("Result:", result);

                // Mark worker as idle again
                this.idleWorkers.push(worker);
                this.runNext();
            });

            this.workers.push(worker);
            this.idleWorkers.push(worker);
        }
    }

    addTask(task) {
        this.taskQueue.push(task);
        this.runNext();
    }

    runNext() {
        if(this.taskQueue.length === 0) return;
        if(this.idleWorkers.length === 0) return;

        const task = this.taskQueue.shift();
        console.log(task)
        const worker = this.idleWorkers.pop();
        console.log(worker)

        worker.postMessage(task);
    }
}

const pool = new ThreadPool();

[1,2,3,4,5,6,7,8].forEach(task => {
    pool.addTask(task);
});