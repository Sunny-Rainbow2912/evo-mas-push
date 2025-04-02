"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addCommand = exports.sendError = exports.sendMessage = void 0;
const electron_log_1 = __importDefault(require("electron-log"));
function sendMessage(event, payload) {
    electron_log_1.default.debug(`child process with pid ${process.pid} sending "${event}" event with payload: ${JSON.stringify(payload)}`);
    if (process.send) {
        process.send({ event, payload });
    }
    else {
        electron_log_1.default.error(`cannot send to main process from worker! connected: ${process.connected} pid: ${process.pid}`);
    }
}
exports.sendMessage = sendMessage;
function sendError(err) {
    sendMessage('error', err.message);
}
exports.sendError = sendError;
const messageHandlers = {};
function handleMessageFromParent(message) {
    electron_log_1.default.debug(`child process with pid ${process.pid} received message: ${message.command} ${JSON.stringify(message.args)}`);
    const args = message.args || [];
    if (messageHandlers[message.command]) {
        messageHandlers[message.command](...args);
    }
    else {
        electron_log_1.default.warn(`child process with pid ${process.pid} received unexpected message: ${message.command}`);
    }
}
// calling this function has the side effect of adding a message listener to the process
// so it should only be called by a child process listening to messages from a main
// process via an IPC channel
function addCommand(command, handler) {
    if (process.listenerCount('message') === 0) {
        process.on('message', handleMessageFromParent);
    }
    messageHandlers[command] = handler;
}
exports.addCommand = addCommand;
