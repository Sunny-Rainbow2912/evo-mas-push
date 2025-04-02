"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchWithTimeout = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
async function fetchWithTimeout(url, options, timeout) {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeout);
    return (0, node_fetch_1.default)(url, { ...options, signal: controller.signal });
}
exports.fetchWithTimeout = fetchWithTimeout;
