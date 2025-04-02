"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_log_1 = __importDefault(require("electron-log"));
const has = (value) => value !== null && value !== undefined;
function default_1(data) {
    try {
        const payload = JSON.parse(data) || {};
        if (has(payload.id) && has(payload.method)) {
            if (!payload.params)
                payload.params = [];
            return (!!((typeof payload.id === 'number' || typeof payload.id === 'string') &&
                typeof payload.jsonrpc === 'string' &&
                typeof payload.method === 'string' &&
                (Array.isArray(payload.params) || typeof payload.params === 'object')) && payload);
        }
    }
    catch (e) {
        electron_log_1.default.info('Error parsing payload: ', data, e);
    }
    return false;
}
exports.default = default_1;
