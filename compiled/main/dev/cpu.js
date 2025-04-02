"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const electron_log_1 = __importDefault(require("electron-log"));
function setupCpuMonitoring() {
    const cpuMonitoringInterval = 10; // seconds
    const cpuThreshold = 30; // percent
    setTimeout(() => {
        electron_1.app.getAppMetrics();
        setInterval(() => {
            const cpuUsers = electron_1.app.getAppMetrics().filter((metric) => metric.cpu.percentCPUUsage > cpuThreshold);
            if (cpuUsers.length > 0) {
                electron_log_1.default.verbose(`Following processes used more than ${cpuThreshold}% CPU over the last ${cpuMonitoringInterval} seconds`);
                electron_log_1.default.verbose(JSON.stringify(cpuUsers, undefined, 2));
            }
        }, cpuMonitoringInterval * 1000);
    }, 10000);
}
exports.default = setupCpuMonitoring;
