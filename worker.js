const { parentPort } = require("worker_threads");

parentPort.on("message", (task) => {
    try {

        const fn = eval(`(${task.fn})`);

        const result = fn(...task.args);

        parentPort.postMessage({
            id: task.id,
            result: result,
            error: null
        });

    } catch (error) {

        parentPort.postMessage({
            id: task.id,
            result: null,
            error: error.message
        });

    }
});
