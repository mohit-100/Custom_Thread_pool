const { parentPort } = require("worker_threads");

parentPort.on("message", (task) => {
    // Do heavy work here
    const result = task * 2;  // example work

    parentPort.postMessage(result);
});