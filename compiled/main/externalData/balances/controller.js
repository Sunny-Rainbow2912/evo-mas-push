"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_log_1 = __importDefault(require("electron-log"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const stream_1 = require("stream");
const balance_1 = require("../../../resources/domain/balance");
const BOOTSTRAP_TIMEOUT_SECONDS = 20;
class BalancesWorkerController extends stream_1.EventEmitter {
    constructor() {
        super();
        const workerArgs = process.env.NODE_ENV === 'development' ? ['--inspect=127.0.0.1:9230'] : [];
        this.worker = (0, child_process_1.fork)(path_1.default.resolve(__dirname, 'worker.js'), [], { execArgv: workerArgs });
        electron_log_1.default.info('created balances worker, pid:', this.worker.pid);
        // restart the worker if no ready event is received within a reasonable time frame
        this.bootstrapTimeout = setTimeout(() => {
            electron_log_1.default.warn(`Balances worker with pid ${this.worker.pid} did not report as ready after ${BOOTSTRAP_TIMEOUT_SECONDS} seconds, killing worker`);
            this.stopWorker();
        }, BOOTSTRAP_TIMEOUT_SECONDS * 1000);
        this.worker.on('message', (message) => {
            electron_log_1.default.debug(`balances controller received message: ${JSON.stringify(message)}`);
            if (message.type === 'ready') {
                this.clearBootstrapTimeout();
                electron_log_1.default.info(`balances worker ready, pid: ${this.worker.pid}`);
                this.heartbeat = setInterval(() => this.sendHeartbeat(), 1000 * 20);
                this.emit('ready');
            }
            if (message.type === 'chainBalances') {
                const { address, balances } = message;
                this.emit('chainBalances', address, balances);
            }
            if (message.type === 'tokenBalances') {
                const { address, balances } = message;
                this.emit('tokenBalances', address, balances);
            }
            if (message.type === 'tokenBlacklist') {
                const { address, tokens } = message;
                const tokenSet = new Set(tokens.map(balance_1.toTokenId));
                this.emit('tokenBlacklist', address, tokenSet);
            }
        });
        this.worker.on('close', (code, signal) => {
            // emitted after exit or error and when all stdio streams are closed
            electron_log_1.default.warn(`balances worker exited with code ${code}, signal: ${signal}, pid: ${this.worker.pid}`);
            this.worker.removeAllListeners();
            this.emit('close');
            this.removeAllListeners();
        });
        this.worker.on('disconnect', () => {
            electron_log_1.default.warn(`balances worker disconnected`);
            this.stopWorker();
        });
        this.worker.on('error', (err) => {
            electron_log_1.default.warn(`balances worker sent error, pid: ${this.worker.pid}`, err);
            this.stopWorker();
        });
    }
    close() {
        electron_log_1.default.info(`closing worker controller`);
        this.stopWorker();
    }
    isRunning() {
        return !!this.heartbeat;
    }
    updateChainBalances(address, chains) {
        this.sendCommandToWorker('updateChainBalance', [address, chains]);
    }
    updateKnownTokenBalances(address, tokens) {
        this.sendCommandToWorker('fetchTokenBalances', [address, tokens]);
    }
    scanForTokenBalances(address, tokens, chains) {
        this.sendCommandToWorker('tokenBalanceScan', [address, tokens, chains]);
    }
    // private
    stopWorker() {
        if (this.heartbeat) {
            clearInterval(this.heartbeat);
            this.heartbeat = undefined;
        }
        this.clearBootstrapTimeout();
        this.worker.kill('SIGTERM');
    }
    isWorkerReachable() {
        return this.worker.connected && this.worker.channel && this.worker.listenerCount('error') > 0;
    }
    // sending messages
    sendCommandToWorker(command, args = []) {
        electron_log_1.default.debug(`sending command ${command} to worker`);
        try {
            if (!this.isWorkerReachable()) {
                electron_log_1.default.error(`attempted to send command "${command}" to worker but worker cannot be reached!`);
                return;
            }
            this.worker.send({ command, args });
        }
        catch (e) {
            electron_log_1.default.error(`unknown error sending command "${command}" to worker`, e);
        }
    }
    sendHeartbeat() {
        this.sendCommandToWorker('heartbeat');
    }
    clearBootstrapTimeout() {
        if (this.bootstrapTimeout) {
            clearTimeout(this.bootstrapTimeout);
            this.bootstrapTimeout = undefined;
        }
    }
}
exports.default = BalancesWorkerController;
