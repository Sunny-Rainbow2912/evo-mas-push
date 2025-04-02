"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestQueue = void 0;
const electron_log_1 = __importDefault(require("electron-log"));
const noRequest = {
    type: 'emptyQueue',
    execute: () => Promise.resolve()
};
class RequestQueue {
    constructor() {
        this.running = false;
        this.requestQueue = [];
        this.requestPoller = setTimeout(() => { });
    }
    add(request) {
        this.requestQueue.push(request);
    }
    pollRequest() {
        // each request must return a promise
        const request = this.requestQueue.length === 0 ? noRequest : this.requestQueue.splice(0, 1)[0];
        request
            .execute()
            .catch((err) => electron_log_1.default.warn('Ledger request queue caught unexpected error', err))
            .finally(() => {
            if (this.running) {
                this.requestPoller = setTimeout(this.pollRequest.bind(this), 200);
            }
        });
    }
    start() {
        this.running = true;
        this.pollRequest();
    }
    stop() {
        this.running = false;
        clearTimeout(this.requestPoller);
    }
    close() {
        this.stop();
        this.clear();
    }
    clear() {
        this.requestQueue = [];
    }
    peekBack() {
        return this.requestQueue[this.requestQueue.length - 1];
    }
}
exports.RequestQueue = RequestQueue;
