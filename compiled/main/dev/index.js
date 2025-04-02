"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCpuMonitoring = exports.installDevTools = void 0;
var extensions_1 = require("./extensions");
Object.defineProperty(exports, "installDevTools", { enumerable: true, get: function () { return __importDefault(extensions_1).default; } });
var cpu_1 = require("./cpu");
Object.defineProperty(exports, "startCpuMonitoring", { enumerable: true, get: function () { return __importDefault(cpu_1).default; } });
