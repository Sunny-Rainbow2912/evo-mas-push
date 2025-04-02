"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("./http"));
const ws_1 = __importDefault(require("./ws"));
(0, ws_1.default)((0, http_1.default)()).listen(1248, '127.0.0.1');
