"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const events_1 = require("events");
const electron_log_1 = __importDefault(require("electron-log"));
class WorkerProcess extends events_1.EventEmitter {
    constructor(opts) {
        super();
        this.name = opts.name;
        this.abortController = new AbortController();
        const { signal } = this.abortController;
        electron_log_1.default.verbose('creating worker with path:', opts.modulePath + ' ' + (opts.args || []).join(' '));
        this.worker = (0, child_process_1.fork)(opts.modulePath, opts.args, {
            signal,
            env: opts.env
        });
        electron_log_1.default.info(`created ${this.name} worker, pid: ${this.worker.pid}`);
        if (opts.timeout) {
            setTimeout(() => {
                electron_log_1.default.warn(`worker process ${this.name} timed out`);
                this.abortController.abort();
            }, opts.timeout);
        }
        this.worker.on('message', (message) => this.emit(message.event, message.payload));
        this.worker.once('error', (err) => {
            electron_log_1.default.warn(`worker process ${this.name} raised error: ${err}`);
            this.kill();
        });
        this.worker.once('exit', (code) => {
            electron_log_1.default.verbose(`worker process ${this.name} exited with code: ${code}`);
            this.kill();
        });
    }
    send(command, ...args) {
        this.worker.send({ command, args });
    }
    kill(signal) {
        this.emit('exit');
        this.removeAllListeners();
        this.worker.kill(signal);
    }
}
exports.default = WorkerProcess;
