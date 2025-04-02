"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionSchema = void 0;
const zod_1 = require("zod");
const statusValues = [
    'connected',
    'disconnected',
    'loading',
    'standby',
    'off',
    'error',
    'chain mismatch'
];
const presetValues = ['local', 'custom', 'pylon'];
exports.ConnectionSchema = zod_1.z.object({
    on: zod_1.z.boolean(),
    connected: zod_1.z.boolean(),
    current: zod_1.z.enum(presetValues),
    status: zod_1.z.enum(statusValues),
    custom: zod_1.z.string().default('')
});
