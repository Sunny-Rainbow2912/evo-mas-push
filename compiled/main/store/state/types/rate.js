"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateSchema = void 0;
const zod_1 = require("zod");
exports.RateSchema = zod_1.z.object({
    price: zod_1.z.number(),
    change24hr: zod_1.z.number()
});
